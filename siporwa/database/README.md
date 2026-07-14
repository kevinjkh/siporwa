# Database MySQL

File utama database ada di:

- `database/kkn_point_reward_mysql.sql`

Skema ini sudah mencakup:

- tabel `admins`
- tabel master `swk_locations`
- tabel `visitors`
- tabel `purchase_transactions`
- tabel `purchase_receipts`
- tabel `visitor_point_logs`
- view `v_statistics_by_swk`
- trigger validasi
- procedure reset point 30 hari
- event harian untuk reset point otomatis

## Cara import

1. Buka MySQL 8.x
2. Jalankan file SQL:

```sql
SOURCE path/ke/database/kkn_point_reward_mysql.sql;
```

Atau lewat command line:

```bash
mysql -u root -p < database/kkn_point_reward_mysql.sql
```

## Catatan

- Nomor telepon divalidasi harus diawali `08`
- Email divalidasi ke domain `@gmail.com` agar sesuai perilaku aplikasi saat ini
- Maksimal gambar per transaksi adalah `10`
- Point maksimal per pengunjung adalah `1000`
- Reset point otomatis dijalankan lewat MySQL Event Scheduler

Jika Event Scheduler belum aktif di server:

```sql
SET GLOBAL event_scheduler = ON;
```
