-- Skema MySQL untuk Sistem Pemantauan Point Reward
-- Dibuat menyesuaikan alur aplikasi saat ini:
-- 1. Registrasi/login pengunjung
-- 2. Pilih SWK
-- 3. Upload gambar makanan/minuman/struk
-- 4. Input data pembelian
-- 5. Perhitungan point reward

CREATE DATABASE IF NOT EXISTS kkn
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE kkn;

SET NAMES utf8mb4;
SET time_zone = '+07:00';

CREATE TABLE IF NOT EXISTS swk_locations (
    swk_id TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
    swk_code VARCHAR(30) NOT NULL,
    swk_name VARCHAR(100) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (swk_id),
    UNIQUE KEY uq_swk_locations_code (swk_code),
    UNIQUE KEY uq_swk_locations_name (swk_name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS admins (
    admin_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) DEFAULT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (admin_id),
    UNIQUE KEY uq_admins_username (username)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS visitors (
    visitor_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    swk_id TINYINT UNSIGNED NOT NULL,
    name VARCHAR(120) NOT NULL,
    username VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(150) DEFAULT NULL,
    phone VARCHAR(20) NOT NULL,
    current_points INT UNSIGNED NOT NULL DEFAULT 0,
    registered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    points_reset_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at DATETIME DEFAULT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (visitor_id),
    UNIQUE KEY uq_visitors_username (username),
    UNIQUE KEY uq_visitors_email (email),
    UNIQUE KEY uq_visitors_phone (phone),
    KEY idx_visitors_swk_id (swk_id),
    KEY idx_visitors_points (current_points),
    CONSTRAINT fk_visitors_swk
        FOREIGN KEY (swk_id) REFERENCES swk_locations (swk_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS purchase_transactions (
    purchase_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    visitor_id BIGINT UNSIGNED NOT NULL,
    swk_id TINYINT UNSIGNED NOT NULL,
    item_name VARCHAR(150) NOT NULL,
    purchase_date DATE NOT NULL,
    qty INT UNSIGNED NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(14,2) GENERATED ALWAYS AS (qty * unit_price) STORED,
    receipt_count TINYINT UNSIGNED NOT NULL DEFAULT 0,
    points_added INT UNSIGNED NOT NULL DEFAULT 0,
    validation_status ENUM('pending', 'confirmed', 'rejected') NOT NULL DEFAULT 'confirmed',
    submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (purchase_id),
    KEY idx_purchase_transactions_visitor_id (visitor_id),
    KEY idx_purchase_transactions_swk_id (swk_id),
    KEY idx_purchase_transactions_purchase_date (purchase_date),
    CONSTRAINT fk_purchase_transactions_visitor
        FOREIGN KEY (visitor_id) REFERENCES visitors (visitor_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_purchase_transactions_swk
        FOREIGN KEY (swk_id) REFERENCES swk_locations (swk_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS purchase_receipts (
    receipt_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    purchase_id BIGINT UNSIGNED NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    stored_file_name VARCHAR(255) DEFAULT NULL,
    file_mime VARCHAR(100) DEFAULT NULL,
    file_size_bytes INT UNSIGNED DEFAULT NULL,
    validation_type ENUM('food_drink', 'receipt') NOT NULL DEFAULT 'receipt',
    validation_notes VARCHAR(255) DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (receipt_id),
    KEY idx_purchase_receipts_purchase_id (purchase_id),
    CONSTRAINT fk_purchase_receipts_purchase
        FOREIGN KEY (purchase_id) REFERENCES purchase_transactions (purchase_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS visitor_point_logs (
    point_log_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    visitor_id BIGINT UNSIGNED NOT NULL,
    purchase_id BIGINT UNSIGNED DEFAULT NULL,
    change_type ENUM('purchase', 'manual_adjustment', 'expiry_reset') NOT NULL,
    points_delta INT NOT NULL,
    balance_after INT UNSIGNED NOT NULL,
    notes VARCHAR(255) DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (point_log_id),
    KEY idx_visitor_point_logs_visitor_id (visitor_id),
    KEY idx_visitor_point_logs_purchase_id (purchase_id),
    KEY idx_visitor_point_logs_change_type (change_type),
    CONSTRAINT fk_visitor_point_logs_visitor
        FOREIGN KEY (visitor_id) REFERENCES visitors (visitor_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_visitor_point_logs_purchase
        FOREIGN KEY (purchase_id) REFERENCES purchase_transactions (purchase_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB;

INSERT INTO swk_locations (swk_code, swk_name)
VALUES
    ('ketabang', 'SWK Ketabang'),
    ('taman_prestasi', 'SWK Taman Prestasi'),
    ('mulyorejo', 'SWK Mulyorejo')
ON DUPLICATE KEY UPDATE
    swk_name = VALUES(swk_name),
    is_active = 1,
    updated_at = CURRENT_TIMESTAMP;

-- Password awal admin: swksby
-- Saat backend dibuat, cocokkan hash input dengan SHA2(password, 256)
-- atau ganti ke bcrypt/argon2 sesuai kebutuhan.
INSERT INTO admins (username, password_hash, full_name)
VALUES ('admin', SHA2('swksby', 256), 'Administrator')
ON DUPLICATE KEY UPDATE
    full_name = VALUES(full_name),
    is_active = 1,
    updated_at = CURRENT_TIMESTAMP;

DROP VIEW IF EXISTS v_statistics_by_swk;

CREATE VIEW v_statistics_by_swk AS
SELECT
    s.swk_id,
    s.swk_code,
    s.swk_name,
    (
        SELECT COUNT(*)
        FROM visitors v
        WHERE v.swk_id = s.swk_id
          AND v.is_active = 1
    ) AS total_visitors,
    (
        SELECT COALESCE(SUM(v.current_points), 0)
        FROM visitors v
        WHERE v.swk_id = s.swk_id
          AND v.is_active = 1
    ) AS total_active_points,
    (
        SELECT COUNT(*)
        FROM purchase_transactions p
        WHERE p.swk_id = s.swk_id
          AND p.validation_status = 'confirmed'
    ) AS total_transactions,
    (
        SELECT COALESCE(SUM(p.total_price), 0)
        FROM purchase_transactions p
        WHERE p.swk_id = s.swk_id
          AND p.validation_status = 'confirmed'
    ) AS total_spending
FROM swk_locations s
WHERE s.is_active = 1;

DROP TRIGGER IF EXISTS tr_visitors_bi_validate;
DROP TRIGGER IF EXISTS tr_visitors_bu_validate;
DROP TRIGGER IF EXISTS tr_purchase_transactions_bi_calculate;
DROP TRIGGER IF EXISTS tr_purchase_transactions_ai_apply_points;
DROP TRIGGER IF EXISTS tr_purchase_receipts_bi_validate;
DROP TRIGGER IF EXISTS tr_purchase_receipts_ai_sync_count;
DROP TRIGGER IF EXISTS tr_purchase_receipts_ad_sync_count;
DROP PROCEDURE IF EXISTS sp_reset_expired_visitor_points;
DROP EVENT IF EXISTS ev_reset_expired_visitor_points;

DELIMITER $$

CREATE TRIGGER tr_visitors_bi_validate
BEFORE INSERT ON visitors
FOR EACH ROW
BEGIN
    IF NEW.phone IS NULL OR NEW.phone NOT REGEXP '^08[0-9]+$' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Nomor telepon pengunjung harus diawali 08.';
    END IF;

    IF NEW.email IS NOT NULL AND NEW.email <> '' AND NEW.email NOT REGEXP '^[^@]+@gmail\\.com$' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Email pengunjung harus menggunakan domain @gmail.com.';
    END IF;

    IF NEW.current_points > 1000 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Point pengunjung tidak boleh lebih dari 1000.';
    END IF;
END $$

CREATE TRIGGER tr_visitors_bu_validate
BEFORE UPDATE ON visitors
FOR EACH ROW
BEGIN
    IF NEW.phone IS NULL OR NEW.phone NOT REGEXP '^08[0-9]+$' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Nomor telepon pengunjung harus diawali 08.';
    END IF;

    IF NEW.email IS NOT NULL AND NEW.email <> '' AND NEW.email NOT REGEXP '^[^@]+@gmail\\.com$' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Email pengunjung harus menggunakan domain @gmail.com.';
    END IF;

    IF NEW.current_points > 1000 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Point pengunjung tidak boleh lebih dari 1000.';
    END IF;
END $$

CREATE TRIGGER tr_purchase_transactions_bi_calculate
BEFORE INSERT ON purchase_transactions
FOR EACH ROW
BEGIN
    DECLARE v_swk_id TINYINT UNSIGNED DEFAULT NULL;
    DECLARE v_current_points INT UNSIGNED DEFAULT 0;
    DECLARE v_raw_points INT UNSIGNED DEFAULT 0;

    IF NEW.qty IS NULL OR NEW.qty = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Qty barang harus lebih dari 0.';
    END IF;

    IF NEW.unit_price IS NULL OR NEW.unit_price <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Harga barang harus lebih dari 0.';
    END IF;

    IF NEW.purchase_date IS NULL OR NEW.purchase_date > CURRENT_DATE() THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Tanggal pembelian tidak valid.';
    END IF;

    SELECT v.swk_id, v.current_points
      INTO v_swk_id, v_current_points
      FROM visitors v
     WHERE v.visitor_id = NEW.visitor_id
     LIMIT 1;

    IF v_swk_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Pengunjung untuk transaksi tidak ditemukan.';
    END IF;

    IF NEW.swk_id <> v_swk_id THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'SWK transaksi harus sama dengan SWK pengunjung.';
    END IF;

    SET v_raw_points = FLOOR((NEW.qty * NEW.unit_price) / 10000) * 100;
    SET NEW.points_added = LEAST(v_raw_points, GREATEST(0, 1000 - v_current_points));
    SET NEW.receipt_count = 0;
END $$

CREATE TRIGGER tr_purchase_transactions_ai_apply_points
AFTER INSERT ON purchase_transactions
FOR EACH ROW
BEGIN
    UPDATE visitors
       SET current_points = LEAST(1000, current_points + NEW.points_added),
           points_reset_at = CURRENT_TIMESTAMP
     WHERE visitor_id = NEW.visitor_id;

    IF NEW.points_added > 0 THEN
        INSERT INTO visitor_point_logs (
            visitor_id,
            purchase_id,
            change_type,
            points_delta,
            balance_after,
            notes,
            created_at
        )
        SELECT
            NEW.visitor_id,
            NEW.purchase_id,
            'purchase',
            NEW.points_added,
            v.current_points,
            CONCAT('Pembelian ', NEW.item_name),
            NEW.submitted_at
        FROM visitors v
        WHERE v.visitor_id = NEW.visitor_id;
    END IF;
END $$

CREATE TRIGGER tr_purchase_receipts_bi_validate
BEFORE INSERT ON purchase_receipts
FOR EACH ROW
BEGIN
    DECLARE v_receipt_total INT DEFAULT 0;

    SELECT COUNT(*)
      INTO v_receipt_total
      FROM purchase_receipts
     WHERE purchase_id = NEW.purchase_id;

    IF v_receipt_total >= 10 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Setiap transaksi maksimal memiliki 10 gambar.';
    END IF;

    IF NEW.file_mime IS NOT NULL AND NEW.file_mime <> '' AND NEW.file_mime NOT LIKE 'image/%' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'File transaksi harus berupa gambar.';
    END IF;
END $$

CREATE TRIGGER tr_purchase_receipts_ai_sync_count
AFTER INSERT ON purchase_receipts
FOR EACH ROW
BEGIN
    UPDATE purchase_transactions
       SET receipt_count = (
           SELECT COUNT(*)
           FROM purchase_receipts
           WHERE purchase_id = NEW.purchase_id
       )
     WHERE purchase_id = NEW.purchase_id;
END $$

CREATE TRIGGER tr_purchase_receipts_ad_sync_count
AFTER DELETE ON purchase_receipts
FOR EACH ROW
BEGIN
    UPDATE purchase_transactions
       SET receipt_count = (
           SELECT COUNT(*)
           FROM purchase_receipts
           WHERE purchase_id = OLD.purchase_id
       )
     WHERE purchase_id = OLD.purchase_id;
END $$

CREATE PROCEDURE sp_reset_expired_visitor_points()
BEGIN
    INSERT INTO visitor_point_logs (
        visitor_id,
        purchase_id,
        change_type,
        points_delta,
        balance_after,
        notes,
        created_at
    )
    SELECT
        v.visitor_id,
        NULL,
        'expiry_reset',
        -CAST(v.current_points AS SIGNED),
        0,
        'Reset poin otomatis setelah 30 hari',
        CURRENT_TIMESTAMP
    FROM visitors v
    WHERE v.current_points > 0
      AND v.points_reset_at <= (CURRENT_TIMESTAMP - INTERVAL 30 DAY);

    UPDATE visitors
       SET current_points = 0,
           points_reset_at = CURRENT_TIMESTAMP
     WHERE current_points > 0
       AND points_reset_at <= (CURRENT_TIMESTAMP - INTERVAL 30 DAY);
END $$

CREATE EVENT ev_reset_expired_visitor_points
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP + INTERVAL 1 DAY
DO
BEGIN
    CALL sp_reset_expired_visitor_points();
END $$

DELIMITER ;

-- Aktifkan scheduler event di server MySQL jika belum aktif:
-- SET GLOBAL event_scheduler = ON;

-- Contoh query statistik:
-- SELECT * FROM v_statistics_by_swk;

-- Contoh history pembelian pengunjung:
-- SELECT
--     v.name,
--     p.item_name,
--     p.purchase_date,
--     p.qty,
--     p.unit_price,
--     p.total_price,
--     p.points_added
-- FROM purchase_transactions p
-- JOIN visitors v ON v.visitor_id = p.visitor_id
-- ORDER BY p.submitted_at DESC;
