/*
	LOGIN ADMIN
*/
(function () {
	var DEFAULT_ADMIN_USERNAME = 'admin';
	var DEFAULT_ADMIN_PASSWORD = 'swksby';
	var ADMIN_PASSWORD_KEY = 'kkn_admin_password_v1';
	var ADMIN_SESSION_KEY = 'kkn_admin_session_v1';
	var ADMIN_REDIRECT_KEY = 'kkn_admin_redirect_v1';

	function getAdminPassword() {
		return localStorage.getItem(ADMIN_PASSWORD_KEY) || DEFAULT_ADMIN_PASSWORD;
	}

	function isBlank(value) {
		return !value || !String(value).trim();
	}

	function showAlert(message) {
		alert(message);
	}

	function getAdminRedirectTarget() {
		return sessionStorage.getItem(ADMIN_REDIRECT_KEY) || 'pemilihan_swk.html';
	}

	function setAdminRedirectTarget(target) {
		sessionStorage.setItem(ADMIN_REDIRECT_KEY, target || 'pemilihan_swk.html');
	}

	function clearAdminRedirectTarget() {
		sessionStorage.removeItem(ADMIN_REDIRECT_KEY);
	}

	var modal = document.getElementById('admin-auth-modal');
	var loginView = document.getElementById('admin-auth-view-login');
	var forgotView = document.getElementById('admin-auth-view-forgot');
	var loginForm = document.getElementById('admin-login-form');
	var forgotForm = document.getElementById('admin-forgot-form');
	var loginMessage = document.getElementById('admin-login-message');
	var loginError = document.getElementById('admin-login-error');
	var forgotError = document.getElementById('admin-forgot-error');

	function setMessage(element, text) {
		if (!element) return;
		element.textContent = text || '';
		element.hidden = !text;
	}

	function showAdminView(view) {
		if (!loginView || !forgotView) return;
		var isLogin = view === 'login';
		loginView.hidden = !isLogin;
		forgotView.hidden = isLogin;
		setMessage(loginError, '');
		setMessage(forgotError, '');
	}

	function openAdminModal(view) {
		if (!modal) return;
		modal.classList.add('is-visible');
		modal.setAttribute('aria-hidden', 'false');
		showAdminView(view || 'login');
	}

	function closeAdminModal() {
		if (!modal) return;
		modal.classList.remove('is-visible');
		modal.setAttribute('aria-hidden', 'true');
	}

	document.addEventListener('click', function (event) {
		var open = event.target.closest('[data-admin-auth-open]');
		if (open) {
			event.preventDefault();
			setMessage(loginMessage, '');
			setAdminRedirectTarget(open.getAttribute('data-admin-auth-redirect') || 'pemilihan_swk.html');
			openAdminModal('login');
			return;
		}

		if (event.target.closest('[data-admin-auth-close]')) {
			event.preventDefault();
			closeAdminModal();
			return;
		}

		if (modal && event.target === modal) {
			closeAdminModal();
			return;
		}

		if (event.target.closest('[data-admin-auth-forgot]')) {
			event.preventDefault();
			showAdminView('forgot');
			return;
		}

		if (event.target.closest('[data-admin-auth-back]')) {
			event.preventDefault();
			showAdminView('login');
			return;
		}
	});

	document.addEventListener('keydown', function (event) {
		if (event.key === 'Escape' && modal && modal.classList.contains('is-visible')) {
			closeAdminModal();
		}
	});

	if (loginForm) {
		loginForm.addEventListener('submit', function (event) {
			event.preventDefault();
			setMessage(loginError, '');
			setMessage(loginMessage, '');

			Promise.resolve().then(async function () {
				var username = (document.getElementById('admin-username') || {}).value || '';
				var password = (document.getElementById('admin-password') || {}).value || '';
				username = username.trim();

				if (isBlank(username) && isBlank(password)) {
					showAlert('belum bisa login isi username dan password terlebih dahulu');
					return;
				}

				if (isBlank(username) || isBlank(password)) {
					showAlert('belum bisa login isi username dan password terlebih dahulu');
					return;
				}

				if (username !== DEFAULT_ADMIN_USERNAME || password !== getAdminPassword()) {
					showAlert('username dan password salah');
					return;
				}

				closeAdminModal();
				localStorage.setItem(ADMIN_SESSION_KEY, '1');
				var redirectTarget = getAdminRedirectTarget();
				clearAdminRedirectTarget();
				location.href = redirectTarget;
			}).catch(function () {
				setMessage(loginError, 'Terjadi error. Coba lagi.');
			});
		});
	}

	if (forgotForm) {
		forgotForm.addEventListener('submit', function (event) {
			event.preventDefault();
			setMessage(forgotError, '');

			Promise.resolve().then(async function () {
				var newPassword = (document.getElementById('admin-new-password') || {}).value || '';
				var confirmPassword = (document.getElementById('admin-confirm-password') || {}).value || '';

				if (isBlank(newPassword) || String(newPassword).length < 4) {
					setMessage(forgotError, 'Password baru minimal 4 karakter.');
					return;
				}

				if (newPassword !== confirmPassword) {
					setMessage(forgotError, 'Konfirmasi password tidak sama.');
					return;
				}

				localStorage.setItem(ADMIN_PASSWORD_KEY, newPassword);

				var np = document.getElementById('admin-new-password');
				var cp = document.getElementById('admin-confirm-password');
				if (np) np.value = '';
				if (cp) cp.value = '';

				setMessage(loginMessage, 'Password berhasil diubah. Silakan login.');
				showAdminView('login');
			}).catch(function () {
				setMessage(forgotError, 'Terjadi error. Coba lagi.');
			});
		});
	}
})();

/*
        PENYIMPANAN PENGUNJUNG
*/
(function () {
        var USERS_KEY = 'kkn_pengunjung_users_v1';
        var SESSION_KEY = 'kkn_pengunjung_current_v1';
        var MAX_POINTS = 1000;
        var RESET_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

        function cloneObject(value) {
                try {
                        return JSON.parse(JSON.stringify(value || {}));
                } catch (e) {
                        return {};
                }
        }

        function normalizePoints(value) {
                var points = parseInt(String(value || '0').replace(/[^0-9]/g, ''), 10);
                if (isNaN(points) || points < 0) {
                        return 0;
                }

                return Math.min(points, MAX_POINTS);
        }

        function parseDate(value) {
                var date = new Date(value);
                if (isNaN(date.getTime())) {
                        return null;
                }

                return date;
        }

        function sanitizeUser(user) {
                var source = cloneObject(user);
                var nowIso = new Date().toISOString();
                var createdAt = source.createdAt || nowIso;
                var pointsResetAt = source.pointsResetAt || createdAt;
                var pointsResetDate = parseDate(pointsResetAt);
                var points = normalizePoints(source.points);
                var changed = false;

                if (!pointsResetDate || (Date.now() - pointsResetDate.getTime()) >= RESET_DURATION_MS) {
                        points = 0;
                        pointsResetAt = nowIso;
                        changed = true;
                }

                var sanitized = {
                        name: source.name || '',
                        username: source.username || '',
                        password: source.password || '',
                        email: source.email || null,
                        phone: source.phone || '',
                        swk: source.swk || '',
                        points: String(points),
                        createdAt: createdAt,
                        pointsResetAt: pointsResetAt,
                        rewardHistory: Array.isArray(source.rewardHistory) ? source.rewardHistory : []
                };

                if (sanitized.name !== source.name ||
                    sanitized.username !== source.username ||
                    sanitized.password !== source.password ||
                    sanitized.email !== source.email ||
                    sanitized.phone !== source.phone ||
                    sanitized.swk !== source.swk ||
                    sanitized.points !== String(source.points || '') ||
                    sanitized.createdAt !== source.createdAt ||
                    sanitized.pointsResetAt !== source.pointsResetAt ||
                    sanitized.rewardHistory !== source.rewardHistory) {
                        changed = true;
                }

                return {
                        user: sanitized,
                        changed: changed
                };
        }

        function parseUsers() {
                try {
                        return JSON.parse(localStorage.getItem(USERS_KEY) || '{}') || {};
                } catch (e) {
                        return {};
                }
        }

        function saveUsers(users) {
                localStorage.setItem(USERS_KEY, JSON.stringify(users || {}));
        }

        function loadUsers() {
                var rawUsers = parseUsers();
                var nextUsers = {};
                var changed = false;

                Object.keys(rawUsers).forEach(function (key) {
                        var safeKey = String(key || '').toLowerCase();
                        var result = sanitizeUser(rawUsers[key]);
                        nextUsers[safeKey] = result.user;
                        if (safeKey !== key || result.changed) {
                                changed = true;
                        }
                });

                if (changed) {
                        saveUsers(nextUsers);
                }

                return nextUsers;
        }

        function getSession() {
                try {
                        var session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
                        if (session && session.username) {
                                return session;
                        }
                } catch (e) {}

                return null;
        }

        function setSession(user) {
                if (!user || !user.username) return;
                localStorage.setItem(SESSION_KEY, JSON.stringify({
                        username: user.username,
                        loggedInAt: new Date().toISOString()
                }));
        }

        function clearSession() {
                localStorage.removeItem(SESSION_KEY);
        }

        function getCurrentUser() {
                var session = getSession();
                if (!session || !session.username) {
                        return null;
                }

                var users = loadUsers();
                var key = String(session.username).toLowerCase();
                if (!users[key]) {
                        clearSession();
                        return null;
                }

                return users[key];
        }

        function updateUser(username, updater) {
                var users = loadUsers();
                var key = String(username || '').toLowerCase();
                if (!users[key]) {
                        return null;
                }

                var draft = cloneObject(users[key]);
                var updated = typeof updater === 'function' ? updater(draft) : draft;
                if (!updated) {
                        return null;
                }

                users[key] = sanitizeUser(updated).user;
                saveUsers(users);
                return users[key];
        }

        window.KKN_VISITOR_STORE = {
                maxPoints: MAX_POINTS,
                loadUsers: loadUsers,
                saveUsers: saveUsers,
                getSession: getSession,
                setSession: setSession,
                clearSession: clearSession,
                getCurrentUser: getCurrentUser,
                updateUser: updateUser
        };
})();

/*
	REGISTRASI PENGUNJUNG
*/
(function () {
        var visitorStore = window.KKN_VISITOR_STORE;

	function isBlank(value) {
		return !value || !String(value).trim();
	}

	function showAlert(message) {
		alert(message);
	}

	var form = document.getElementById('visitor-register-form');
	if (!form) return;

	var successEl = document.getElementById('visitor-register-success');
	var errorEl = document.getElementById('visitor-register-error');

	function setMessage(element, text) {
		if (!element) return;
		element.textContent = text || '';
		element.hidden = !text;
	}

	function normalizeForbiddenName(value) {
		return String(value || '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, ' ')
			.replace(/\s+/g, ' ')
			.trim();
	}

	function getForbiddenNameCategory(value) {
		var normalizedName = normalizeForbiddenName(value);
		var anonymousNames = [
			'alphareturns',
			'bazooka',
			'har de har',
			'betty cricket',
			'bit sentinel',
			'blackat',
			'bomb cyclone',
			'elievemeurlooser',
			'broomspun',
			'basium',
			'bloodfiend',
			'ballisticfury',
			'crimson eclipse',
			'chupa alma',
			'centurion sherman'
		];
		var annoyingNames = [
			'jerk',
			'ass hat',
			'dumb dumb',
			'dummy',
			'doofus',
			'dork',
			'stupid',
			'moron',
			'fool',
			'nincompoop',
			'oaf',
			'ninny',
			'blockhead'
		];
		var dirtyWords = [
			'jancuk',
			'anjing',
			'bangsat',
			'kontol',
			'memek',
			'tolol',
			'bego'
		];

		if (anonymousNames.some(function (term) { return normalizedName.indexOf(term) !== -1; })) {
			return 'anonim';
		}

		if (annoyingNames.some(function (term) { return normalizedName.indexOf(term) !== -1; })) {
			return 'annoying';
		}

		if (dirtyWords.some(function (term) { return normalizedName.indexOf(term) !== -1; })) {
			return 'kata_kotor';
		}

		return '';
	}

	form.addEventListener('submit', function (event) {
		event.preventDefault();
		setMessage(successEl, '');
		setMessage(errorEl, '');

		Promise.resolve().then(async function () {
			var name = (document.getElementById('visitor-name') || {}).value || '';
			var username = (document.getElementById('visitor-username') || {}).value || '';
			var password = (document.getElementById('visitor-password') || {}).value || '';
			var email = (document.getElementById('visitor-email') || {}).value || '';
			var phone = (document.getElementById('visitor-phone') || {}).value || '';
			var swk = (document.getElementById('visitor-swk') || {}).value || '';

			name = name.trim();
			username = username.trim();
			email = email.trim();
			phone = phone.trim();
			swk = swk.trim();

			if (isBlank(name) && isBlank(username) && isBlank(password) && isBlank(email) && isBlank(phone) && isBlank(swk)) {
				showAlert('belum bisa login semua kolom masih kosong mohon isi terlebih dahulu');
				return;
			}

			if (isBlank(name)) {
				showAlert('belum bisa login nama masih kosong');
				return;
			}

			var forbiddenNameCategory = getForbiddenNameCategory(name);
			if (forbiddenNameCategory === 'anonim') {
				showAlert('nama anonim tidak diperbolehkan');
				return;
			}

			if (forbiddenNameCategory === 'annoying') {
				showAlert('nama annoying tidak diperbolehkan');
				return;
			}

			if (forbiddenNameCategory === 'kata_kotor') {
				showAlert('nama mengandung kata-kata kotor harus dirubah');
				return;
			}

			if (isBlank(username)) {
				showAlert('belum bisa login username masih kosong');
				return;
			}

			var forbiddenUsernameCategory = getForbiddenNameCategory(username);
			if (forbiddenUsernameCategory === 'kata_kotor') {
				showAlert('username harus dirubah tidak boleh mengandung kata-kata kotor');
				return;
			}

			if (isBlank(password)) {
				showAlert('belum bisa login password masih kosong');
				return;
			}

			if (!isBlank(email) && !/@gmail\.com$/i.test(email)) {
				showAlert('email harus diubah harus @gmail.com');
				return;
			}

			if (isBlank(phone)) {
				showAlert('belum bisa login nomer telepon masih kosong');
				return;
			}

			if (!/^08/.test(phone)) {
				showAlert('nomer telepon harus diubah');
				return;
			}

			if (isBlank(swk)) {
				showAlert('belum bisa login pilih swk terlebih dahulu');
				return;
			}

                        var users = visitorStore.loadUsers();
			var key = username.toLowerCase();
			if (users[key]) {
				showAlert('username sudah terdaftar');
				return;
			}

                        var nowIso = new Date().toISOString();
			users[key] = {
				name: name,
				username: username,
				password: password,
				email: email || null,
				phone: phone,
				swk: swk,
				points: '0',
                                createdAt: nowIso,
                                pointsResetAt: nowIso,
                                rewardHistory: []
			};
                        visitorStore.saveUsers(users);

			setMessage(successEl, 'Registrasi berhasil. Mengarahkan ke halaman login...');
			setTimeout(function () {
				location.href = 'login_pengunjung.html?username=' + encodeURIComponent(username);
			}, 700);
		}).catch(function () {
			setMessage(errorEl, 'Terjadi error. Coba lagi.');
		});
	});
})();

/*
	LOGIN PENGUNJUNG
*/
(function () {
        var visitorStore = window.KKN_VISITOR_STORE;

	function isBlank(value) {
		return !value || !String(value).trim();
	}

	function showAlert(message) {
		alert(message);
	}

	function getParam(name) {
		try {
			return new URLSearchParams(location.search).get(name);
		} catch (e) {
			return null;
		}
	}

	var form = document.getElementById('visitor-login-form');
	if (!form) return;

	var errorEl = document.getElementById('visitor-login-error');

	function setMessage(element, text) {
		if (!element) return;
		element.textContent = text || '';
		element.hidden = !text;
	}

	var prefUsername = getParam('username');
	if (prefUsername) {
		var u = document.getElementById('visitor-login-username');
		if (u) u.value = prefUsername;
	}

	form.addEventListener('submit', function (event) {
		event.preventDefault();
		setMessage(errorEl, '');

		Promise.resolve().then(async function () {
			var username = (document.getElementById('visitor-login-username') || {}).value || '';
			var password = (document.getElementById('visitor-login-password') || {}).value || '';
			username = username.trim();

			if (isBlank(username) && isBlank(password)) {
				showAlert('maaf kolom masih kosong belum bisa login');
				return;
			}

			if (isBlank(username)) {
				showAlert('maaf kolom username masih kosong belum bisa login');
				return;
			}

			if (isBlank(password)) {
				showAlert('maaf kolom password masih kosong belum bisa login');
				return;
			}

                        var users = visitorStore.loadUsers();
			var key = username.toLowerCase();
			if (!users[key]) {
				showAlert('username salah');
				return;
			}

			if (password !== users[key].password) {
				showAlert('password salah');
				return;
			}

                        visitorStore.setSession(users[key]);

			showAlert('Login pengunjung berhasil.');
                        location.href = 'dashboard_pengunjung.html';
		}).catch(function () {
			setMessage(errorEl, 'Terjadi error. Coba lagi.');
		});
	});
})();

/*
        DASHBOARD PENGUNJUNG
*/
(function () {
        var visitorStore = window.KKN_VISITOR_STORE;
        var path = (location.pathname || '').toLowerCase();
        if (!path.endsWith('dashboard_pengunjung.html')) return;

        function showAlert(message) {
                alert(message);
        }

        function redirectToLogin() {
                location.href = 'login_pengunjung.html';
        }

        function escapeHtml(value) {
                return String(value || '')
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#39;');
        }

        function formatNumber(number) {
                return String(Math.max(0, parseInt(number, 10) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        }

        function parseCurrency(value) {
                var digits = String(value || '').replace(/[^0-9]/g, '');
                return parseInt(digits || '0', 10) || 0;
        }

        function formatCurrency(value) {
                var digits = String(value || '').replace(/[^0-9]/g, '');
                if (!digits) {
                        return '';
                }

                return 'RP ' + formatNumber(parseInt(digits, 10));
        }

        function isValidDateFormat(value) {
                var match = /^(\d{2})-(\d{2})-(\d{2})$/.exec(String(value || '').trim());
                if (!match) {
                        return false;
                }

                var day = parseInt(match[1], 10);
                var month = parseInt(match[2], 10);
                var year = 2000 + parseInt(match[3], 10);
                var date = new Date(year, month - 1, day);

                return date.getFullYear() === year &&
                        date.getMonth() === (month - 1) &&
                        date.getDate() === day;
        }

        function padNumber(value) {
                return String(value).length === 1 ? ('0' + value) : String(value);
        }

        function buildPurchaseDate(dateString) {
                if (!dateString) {
                        return '';
                }
                var parts = String(dateString).split('-');
                if (parts.length !== 3) {
                        return '';
                }

                var year = parts[0];
                var month = parts[1];
                var day = parts[2];

                return padNumber(day) + '-' + padNumber(month) + '-' + String(year).slice(-2);
        }

        var nameEl = document.getElementById('visitor-dashboard-name');
        var pointsEl = document.getElementById('visitor-dashboard-points');
        var swkEl = document.getElementById('visitor-dashboard-swk');
        var logoutButton = document.getElementById('visitor-dashboard-logout');
        var receiptInput = document.getElementById('visitor-receipt-file');
        var receiptConfirmButton = document.getElementById('visitor-receipt-confirm');
        var receiptPreview = document.getElementById('visitor-receipt-preview');
        var receiptPreviewListEl = document.getElementById('visitor-receipt-preview-list');
        var receiptStatusEl = document.getElementById('visitor-receipt-status');
        var dataStageEl = document.getElementById('visitor-data-stage');
        var purchaseForm = document.getElementById('visitor-purchase-form');
        var itemNameEl = document.getElementById('visitor-item-name');
        var purchaseDateEl = document.getElementById('visitor-purchase-date');
        var itemQtyEl = document.getElementById('visitor-item-qty');
        var itemPriceEl = document.getElementById('visitor-item-price');
        var uploadInfoEl = document.getElementById('visitor-upload-info');
        var receiptValidationInProgress = false;
        var foodDrinkClassifierPromise = null;

        var currentUser = visitorStore.getCurrentUser();
        var confirmedReceiptFiles = [];
        var confirmedReceiptPreviews = [];

        if (!currentUser) {
                redirectToLogin();
                return;
        }

        function syncCurrentUser() {
                currentUser = visitorStore.getCurrentUser();
                if (!currentUser) {
                        redirectToLogin();
                        return;
                }

                if (nameEl) {
                        nameEl.textContent = currentUser.name || currentUser.username || '-';
                }

                if (pointsEl) {
                        pointsEl.textContent = currentUser.points || '0';
                }

                if (swkEl) {
                        swkEl.textContent = currentUser.swk || '-';
                }
        }

        function setReceiptPreview(files) {
                if (!receiptPreview || !receiptPreviewListEl) return;

                if (!files || !files.length) {
                        receiptPreview.hidden = true;
                        receiptPreviewListEl.innerHTML = '';
                        return;
                }

                receiptPreview.hidden = false;
                receiptPreviewListEl.innerHTML = files.map(function (fileItem, index) {
                        return '<div class="visitor-receipt-preview__item">' +
                                '<img src="' + escapeHtml(fileItem.dataUrl || '') + '" alt="Preview gambar ' + (index + 1) + '" />' +
                                '<div class="visitor-receipt-preview__meta">' +
                                '<span>File ' + (index + 1) + '</span>' +
                                '<p title="' + escapeHtml(fileItem.name || ('Gambar ' + (index + 1))) + '">' + escapeHtml(fileItem.name || ('Gambar ' + (index + 1))) + '</p>' +
                                '</div>' +
                                '</div>';
                }).join('');
        }

        function setUploadInfo(text) {
                if (!uploadInfoEl) return;
                uploadInfoEl.textContent = text || '';
        }

        function setReceiptValidationState(isLoading, text) {
                receiptValidationInProgress = !!isLoading;

                if (receiptInput) {
                        receiptInput.disabled = !!isLoading;
                }

                if (receiptConfirmButton) {
                        receiptConfirmButton.disabled = !!isLoading;
                }

                if (typeof text === 'string') {
                        setUploadInfo(text);
                }
        }

        function readFileAsDataUrl(file) {
                return new Promise(function (resolve) {
                        var reader = new FileReader();
                        reader.onload = function (loadEvent) {
                                resolve(loadEvent.target.result || '');
                        };
                        reader.readAsDataURL(file);
                });
        }

        function loadFoodDrinkClassifier() {
                if (!window.tf || !window.mobilenet || typeof window.mobilenet.load !== 'function') {
                        return Promise.resolve(null);
                }

                if (!foodDrinkClassifierPromise) {
                        foodDrinkClassifierPromise = window.mobilenet.load();
                }

                return foodDrinkClassifierPromise.catch(function () {
                        foodDrinkClassifierPromise = null;
                        return null;
                });
        }

        function createImageElement(dataUrl) {
                return new Promise(function (resolve, reject) {
                        var image = new Image();
                        image.onload = function () {
                                resolve(image);
                        };
                        image.onerror = function () {
                                reject(new Error('image_load_failed'));
                        };
                        image.src = dataUrl;
                });
        }

        function isFoodOrDrinkLabel(label) {
                return /\b(food|dish|meal|plate|restaurant|pizza|burger|sandwich|hotdog|pasta|spaghetti|noodle|ramen|rice|fried rice|soup|salad|dessert|cake|bread|donut|cookie|chocolate|fruit|banana|apple|orange|pineapple|watermelon|vegetable|carrot|broccoli|cabbage|beverage|drink|coffee|tea|latte|espresso|cappuccino|juice|smoothie|milkshake|soda|cola|water bottle|wine|beer|cocktail|cup)\b/.test(String(label || '').toLowerCase());
        }

        function validateFoodDrinkFile(dataUrl) {
                return loadFoodDrinkClassifier().then(function (classifier) {
                        if (!classifier || typeof classifier.classify !== 'function') {
                                return {
                                        isValid: false,
                                        type: 'food_drink',
                                        error: 'classifier_unavailable'
                                };
                        }

                        return createImageElement(dataUrl).then(function (image) {
                                return classifier.classify(image, 5).then(function (predictions) {
                                        var matchedPrediction = (predictions || []).find(function (prediction) {
                                                return prediction && prediction.probability >= 0.18 && isFoodOrDrinkLabel(prediction.className || '');
                                        });

                                        return {
                                                isValid: !!matchedPrediction,
                                                type: 'food_drink',
                                                matchedLabel: matchedPrediction ? matchedPrediction.className : '',
                                                predictions: predictions || []
                                        };
                                });
                        });
                }).catch(function () {
                        return {
                                isValid: false,
                                type: 'food_drink',
                                error: 'classifier_failed'
                        };
                });
        }

        function normalizeReceiptOcrText(text) {
                return String(text || '')
                        .toLowerCase()
                        .replace(/\r/g, '\n')
                        .replace(/[^\S\n]+/g, ' ')
                        .replace(/\n+/g, '\n')
                        .trim();
        }

        function getReceiptValidationSummary(text) {
                var normalizedText = normalizeReceiptOcrText(text);
                var lines = normalizedText.split('\n').map(function (line) {
                        return line.trim();
                }).filter(Boolean);
                var hasCurrency = /\b(?:rp|idr)\b/.test(normalizedText) || /(?:rp|idr)\s*[\d.,]{3,}/.test(normalizedText);
                var hasTransactionKeyword = /\b(total|subtotal|jumlah|bayar|tunai|cash|kembalian|change|qty|harga|item|diskon|discount|ppn|tax)\b/.test(normalizedText);
                var hasDateOrTime = /\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/.test(normalizedText) || /\b\d{1,2}:\d{2}(?::\d{2})?\b/.test(normalizedText);
                var itemLineCount = lines.filter(function (line) {
                        return /[a-z]/.test(line) && /\d/.test(line) && (/(?:rp|idr)\s*[\d.,]{2,}/.test(line) || /\d+[x×]\d+/.test(line) || /\b\d{3,}\b/.test(line));
                }).length;
                var score = 0;

                if (hasCurrency) score += 2;
                if (hasTransactionKeyword) score += 2;
                if (hasDateOrTime) score += 1;
                if (itemLineCount >= 2) score += 2;
                else if (itemLineCount === 1) score += 1;
                if (lines.length >= 3) score += 1;

                return {
                        isValid: hasCurrency && (hasTransactionKeyword || itemLineCount >= 1) && score >= 4,
                        score: score,
                        text: normalizedText
                };
        }

        function validateReceiptFileWithOcr(file) {
                if (!window.Tesseract || typeof window.Tesseract.recognize !== 'function') {
                        return Promise.resolve({
                                isValid: false,
                                type: 'receipt',
                                error: 'ocr_unavailable'
                        });
                }

                return window.Tesseract.recognize(file, 'eng').then(function (result) {
                        var recognizedText = (((result || {}).data || {}).text) || '';
                        var summary = getReceiptValidationSummary(recognizedText);
                        summary.type = 'receipt';
                        return summary;
                }).catch(function () {
                        return {
                                isValid: false,
                                type: 'receipt',
                                error: 'ocr_failed'
                        };
                });
        }

        function resetReceiptStage(infoText) {
                confirmedReceiptFiles = [];
                confirmedReceiptPreviews = [];
                receiptValidationInProgress = false;

                if (receiptInput) {
                        receiptInput.value = '';
                        receiptInput.disabled = false;
                }

                if (receiptConfirmButton) {
                        receiptConfirmButton.disabled = false;
                }

                if (receiptStatusEl) {
                        receiptStatusEl.textContent = 'Belum ada gambar yang dikonfirmasi.';
                }

                setReceiptPreview([]);
                setUploadInfo(infoText || 'Silakan pilih gambar makanan, minuman, atau struk pembelian terlebih dahulu.');
                if (dataStageEl) {
                        dataStageEl.hidden = true;
                }
        }

        function resetEntireFlow() {
                if (purchaseForm) {
                        purchaseForm.reset();
                }

                if (itemPriceEl) {
                        itemPriceEl.value = '';
                }

                resetReceiptStage();
        }

        function openDataStage() {
                if (dataStageEl) {
                        dataStageEl.hidden = false;
                }

                if (receiptInput) {
                        receiptInput.disabled = true;
                }

                if (receiptConfirmButton) {
                        receiptConfirmButton.disabled = true;
                }

                if (receiptStatusEl && confirmedReceiptFiles.length) {
                        receiptStatusEl.textContent = confirmedReceiptFiles.length + ' gambar sudah dikonfirmasi.';
                }

                setUploadInfo('Lanjutkan dengan mengisi data pembelian di fase berikutnya.');
        }

        if (logoutButton) {
                        logoutButton.addEventListener('click', function () {
                                visitorStore.clearSession();
                                location.href = 'login_pengunjung.html';
                        });
        }

        if (receiptInput) {
                receiptInput.addEventListener('change', async function (event) {
                        var files = Array.prototype.slice.call((event.target.files || []));
                        var previewFiles = [];
                        var invalidFiles = [];
                        var fileIndex;
                        var file;
                        var validationResult;
                        var previewUrl;

                        if (!files.length) {
                                setReceiptPreview([]);
                                setUploadInfo('Silakan pilih gambar makanan, minuman, atau struk pembelian terlebih dahulu.');
                                return;
                        }

                        if (files.length > 10) {
                                showAlert('maksimal upload 10 gambar dalam 1 kali upload');
                                resetReceiptStage('Silakan pilih maksimal 10 gambar makanan, minuman, atau struk pembelian.');
                                return;
                        }

                        if (files.some(function (file) { return !/^image\//i.test(file.type || ''); })) {
                                showAlert('yang bisa diupload hanya gambar makanan, minuman, dan struk pembelian');
                                resetReceiptStage('Silakan pilih gambar makanan, minuman, atau struk pembelian terlebih dahulu.');
                                return;
                        }

                        setReceiptPreview([]);
                        setReceiptValidationState(true, 'Sedang memeriksa isi gambar...');

                        for (fileIndex = 0; fileIndex < files.length; fileIndex += 1) {
                                file = files[fileIndex];
                                setUploadInfo('Sedang memeriksa gambar ' + (fileIndex + 1) + ' dari ' + files.length + '...');
                                previewUrl = await readFileAsDataUrl(file);
                                validationResult = await validateFoodDrinkFile(previewUrl);

                                if (!validationResult.isValid) {
                                        validationResult = await validateReceiptFileWithOcr(file);
                                }

                                if (!validationResult.isValid) {
                                        invalidFiles.push(file.name || ('Gambar ' + (fileIndex + 1)));
                                        continue;
                                }

                                previewFiles.push({
                                        name: file.name,
                                        dataUrl: previewUrl
                                });
                        }

                        if (invalidFiles.length) {
                                showAlert('gambar ditolak karena tidak terdeteksi sebagai makanan, minuman, atau struk pembelian: ' + invalidFiles.join(', '));
                                resetReceiptStage('Silakan pilih gambar makanan, minuman, atau struk pembelian yang terlihat jelas.');
                                return;
                        }

                        setReceiptPreview(previewFiles);
                        setReceiptValidationState(false, files.length + ' gambar siap dikonfirmasi.');
                });
        }

        if (receiptConfirmButton) {
                receiptConfirmButton.addEventListener('click', function () {
                        var files = Array.prototype.slice.call((receiptInput && receiptInput.files) || []);
                        if (receiptValidationInProgress) {
                                showAlert('validasi gambar masih berjalan, mohon tunggu');
                                return;
                        }

                        if (!files.length || !confirmedReceiptPreviews.length && !(receiptPreviewListEl && receiptPreviewListEl.children.length)) {
                                showAlert('silakan upload gambar makanan, minuman, atau struk pembelian terlebih dahulu');
                                return;
                        }

                        var isConfirmed = confirm('apakah anda yakin mengupload gambar ini karena jika iya anda tidak dapat kembali ke fase ini lagi');
                        if (!isConfirmed) {
                                resetReceiptStage('Silakan upload ulang gambar makanan, minuman, atau struk pembelian untuk melanjutkan.');
                                return;
                        }

                        confirmedReceiptFiles = files;
                        confirmedReceiptPreviews = Array.prototype.map.call(receiptPreviewListEl.children || [], function (element, index) {
                                var imageEl = element.querySelector('img');
                                return {
                                        name: files[index] ? files[index].name : '',
                                        dataUrl: imageEl ? imageEl.getAttribute('src') || '' : ''
                                };
                        });
                        openDataStage();
                });
        }

        if (itemPriceEl) {
                itemPriceEl.addEventListener('input', function (event) {
                        event.target.value = formatCurrency(event.target.value);
                });
        }

        if (itemQtyEl) {
                itemQtyEl.addEventListener('input', function (event) {
                        event.target.value = String(event.target.value || '').replace(/[^0-9]/g, '');
                });
        }

        if (purchaseForm) {
                purchaseForm.addEventListener('submit', function (event) {
                        event.preventDefault();

                        if (!confirmedReceiptFiles.length || !confirmedReceiptPreviews.length) {
                                showAlert('silakan konfirmasi gambar makanan, minuman, atau struk pembelian terlebih dahulu');
                                return;
                        }

                        var itemName = (itemNameEl || {}).value || '';
                        var purchaseDate = buildPurchaseDate(
                                (purchaseDateEl || {}).value || ''
                        );
                        var qty = (itemQtyEl || {}).value || '';
                        var price = (itemPriceEl || {}).value || '';

                        itemName = itemName.trim();
                        purchaseDate = purchaseDate.trim();
                        qty = qty.trim();
                        price = price.trim();

                        if (!itemName) {
                                showAlert('nama barang masih kosong');
                                return;
                        }

                        if (!isValidDateFormat(purchaseDate)) {
                                showAlert('tanggal pembelian harus dipilih terlebih dahulu');
                                return;
                        }

                        if (!/^\d+$/.test(qty) || parseInt(qty, 10) <= 0) {
                                showAlert('qty barang hanya boleh angka');
                                return;
                        }

                        if (!/^RP\s\d{1,3}(\.\d{3})*$/i.test(price)) {
                                showAlert('harga barang harus menggunakan format RP dengan separator titik');
                                return;
                        }

                        var isConfirmed = confirm('apakah anda yakin anda akan mengupload data ini');
                        if (!isConfirmed) {
                                showAlert('upload gagal mohon ulangi proses penguploadtan gambar');
                                resetEntireFlow();
                                return;
                        }

                        var qtyNumber = parseInt(qty, 10);
                        var priceNumber = parseCurrency(price);
                        var totalPrice = priceNumber * qtyNumber;
                        var rewardMultiplier = Math.floor(totalPrice / 10000);
                        var addedPoints = rewardMultiplier * 100;
                        var currentPoints = parseInt(currentUser.points || '0', 10) || 0;
                        var nextPoints = Math.min(visitorStore.maxPoints, currentPoints + addedPoints);
                        var appliedPoints = nextPoints - currentPoints;

                        visitorStore.updateUser(currentUser.username, function (user) {
                                user.points = String(nextPoints);
                                user.rewardHistory = Array.isArray(user.rewardHistory) ? user.rewardHistory : [];
                                user.rewardHistory.unshift({
                                        itemName: itemName,
                                        purchaseDate: purchaseDate,
                                        qty: qtyNumber,
                                        price: priceNumber,
                                        totalPrice: totalPrice,
                                        receiptFileNames: confirmedReceiptFiles.map(function (file) { return file.name; }),
                                        receiptCount: confirmedReceiptFiles.length,
                                        addedPoints: appliedPoints,
                                        submittedAt: new Date().toISOString()
                                });
                                return user;
                        });

                        syncCurrentUser();
                        if (totalPrice < 10000) {
                                showAlert('upload telah berhasil. point tidak bertambah karena total belanja kurang dari RP 10.000');
                        } else {
                                showAlert('upload telah berhasil');
                        }
                        resetEntireFlow();
                });
        }

        syncCurrentUser();
        resetReceiptStage('Silakan pilih gambar makanan, minuman, atau struk pembelian terlebih dahulu.');
})();

(function () {
	function normalizeQuery(value) {
		return String(value || '')
			.toLowerCase()
			.replace(/\s+/g, ' ')
			.trim();
	}

	function openAdminLoginOnThisPage() {
		var trigger = document.querySelector('[data-admin-auth-open]');
		if (trigger) trigger.click();
	}

	function openAdminLoginFor(target) {
		var trigger = document.querySelector('[data-admin-auth-open][data-admin-auth-redirect="' + target + '"]');
		if (trigger) {
			trigger.click();
			return;
		}
		location.href = 'index.html?openAdmin=1&redirect=' + encodeURIComponent(target);
	}

	function handleSearch(query) {
		var q = normalizeQuery(query);
		if (!q) return;

		if (q === 'home') {
			location.href = 'index.html';
			return;
		}

		if (q === 'registrasi pengunjung') {
			location.href = 'registrasi_pengunjung.html';
			return;
		}

		if (q === 'login pengunjung') {
			location.href = 'login_pengunjung.html';
			return;
		}

                if (q === 'dashboard pengunjung') {
                        location.href = 'login_pengunjung.html';
                        return;
                }

		if (q === 'login admin') {
			var path = (location.pathname || '').toLowerCase();
			if (path.endsWith('index.html') || path.endsWith('/')) {
				openAdminLoginOnThisPage();
			} else {
				location.href = 'index.html?openAdmin=1';
			}
			return;
		}

		if (q === 'pengundian') {
			openAdminLoginFor('dashboard_pengundian.html');
			return;
		}

                if (q === 'cek statistik') {
                        openAdminLoginFor('pemilihan_swk.html?mode=statistik');
                }
	}

	var forms = document.querySelectorAll('form#search');
	forms.forEach(function (form) {
		form.addEventListener('submit', function (event) {
			event.preventDefault();
			var input = form.querySelector('input[name="query"]') || form.querySelector('input');
			handleSearch(input ? input.value : '');
		});
	});

	try {
		var params = new URLSearchParams(location.search);
		if (params.get('openAdmin') === '1') {
			setAdminRedirectTarget(params.get('redirect') || 'pemilihan_swk.html');
			openAdminLoginOnThisPage();
		}
	} catch (e) {}
})();

(function () {
	var ADMIN_SESSION_KEY = 'kkn_admin_session_v1';
	var SELECTED_SWK_KEY = 'kkn_selected_swk_v1';
        var USERS_KEY = 'kkn_pengunjung_users_v1';

        function showAlert(message) {
                alert(message);
        }

	function isLoggedInAsAdmin() {
		return localStorage.getItem(ADMIN_SESSION_KEY) === '1';
	}

	function getPageMode() {
		try {
			return new URLSearchParams(location.search).get('mode') || '';
		} catch (e) {
			return '';
		}
	}

	var path = (location.pathname || '').toLowerCase();
	var isSwkPage = path.endsWith('pemilihan_swk.html');
	var isLotteryPage = path.endsWith('dashboard_pengundian.html');
	if (!isSwkPage && !isLotteryPage) return;

	var pageMode = getPageMode();
	var isStatisticsMode = isSwkPage && pageMode === 'statistik';

	if (!isLoggedInAsAdmin()) {
		var redirect = isLotteryPage ? 'dashboard_pengundian.html' : (isStatisticsMode ? 'pemilihan_swk.html?mode=statistik' : 'pemilihan_swk.html');
		location.href = 'index.html?openAdmin=1&redirect=' + encodeURIComponent(redirect);
		return;
	}

	if (isLotteryPage) return;

	document.addEventListener('click', function (event) {
		var el = event.target.closest('[data-swk]');
		if (!el) return;
		event.preventDefault();
		var swk = el.getAttribute('data-swk');
		if (!swk) return;
		localStorage.setItem(SELECTED_SWK_KEY, swk);
		renderTable();
	});

	var currentPage = 1;
	var perPage = 100;

	var titleEl = document.getElementById('swk-selected-title');
	var sortWrapperEl = document.getElementById('visitor-sort-wrapper');
	var sortEl = document.getElementById('visitor-sort');
	var statisticsActionsEl = document.getElementById('visitor-statistics-actions');
	var statisticsButtonEl = document.getElementById('visitor-check-statistics');
	var containerEl = document.getElementById('visitor-table-container');
	var paginationEl = document.getElementById('visitor-pagination');
	var rangeEl = document.getElementById('visitor-range');
	var pagesEl = document.getElementById('visitor-pages');
        var resetModalEl = document.getElementById('visitor-reset-modal');
        var resetCloseEls = document.querySelectorAll('[data-visitor-reset-close], [data-visitor-reset-cancel]');
        var resetConfirmEl = document.querySelector('[data-visitor-reset-confirm]');

        function getTableConfig(selectedSort) {
                var headers = ['Nomer', 'Nama'];

                if (selectedSort === 'semua') {
                        headers = headers.concat(['Username', 'Point', 'Nomer Telepon', 'Email', 'SWK']);
                }

                if (selectedSort === 'swk') {
                        headers.push('SWK');
                }

                if (selectedSort === 'point') {
                        headers.push('Point');
                }

                return {
                        selectedSort: selectedSort,
                        showAllColumns: selectedSort === 'semua',
                        showSwkColumn: selectedSort === 'swk',
                        showPointColumn: selectedSort === 'point',
                        headers: headers
                };
        }

        function getCurrentTableState() {
                var swk = localStorage.getItem(SELECTED_SWK_KEY) || '';
                var selectedSort = sortEl ? sortEl.value : 'semua';
                var config = getTableConfig(selectedSort);
                var users = loadUsers().filter(function (user) {
                        return (user && user.swk ? user.swk : '') === swk;
                });
                var total = users.length;
                var totalPages = getTotalPages(total);
                var normalizedPage = Math.min(Math.max(1, currentPage), totalPages);
                var offset = (normalizedPage - 1) * perPage;
                var pageRows = users.slice(offset, offset + perPage);
                var displayRows = [];
                var slot;

                for (slot = 0; slot < perPage; slot += 1) {
                        displayRows.push(pageRows[slot] || null);
                }

                return {
                        swk: swk,
                        total: total,
                        totalPages: totalPages,
                        currentPage: normalizedPage,
                        offset: offset,
                        pageRows: pageRows,
                        displayRows: displayRows,
                        config: config
                };
        }

        function buildRowValues(rowNumber, row, config) {
                var values = [
                        rowNumber,
                        row && row.name ? row.name : 'belum ada pengunjung'
                ];

                if (config.showAllColumns) {
                        values.push(row && row.username ? row.username : 'belum ada pengunjung');
                        values.push(row ? row.points : 'belum ada pengunjung');
                        values.push(row && row.phone ? row.phone : 'belum ada pengunjung');
                        values.push(row && row.email ? row.email : 'belum ada pengunjung');
                        values.push(row && row.swk ? row.swk : 'belum ada pengunjung');
                }

                if (config.showSwkColumn) {
                        values.push(row && row.swk ? row.swk : 'belum ada pengunjung');
                }

                if (config.showPointColumn) {
                        values.push(row ? row.points : 'belum ada pengunjung');
                }

                return values;
        }

        function getExportFileName(page, swk) {
                return 'page' + page + '_' + String(swk || '').toLowerCase() + '.xlsx';
        }

        function triggerDownload(buffer, fileName) {
                var blob = new Blob([buffer], {
                        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                });
                var url = URL.createObjectURL(blob);
                var link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(function () {
                        URL.revokeObjectURL(url);
                }, 1000);
        }

        function loadUsers() {
                var visitorStore = window.KKN_VISITOR_STORE;
                var raw = visitorStore ? visitorStore.loadUsers() : {};
                return Object.keys(raw).map(function (key) {
                        return raw[key];
                });
	}

	function setHidden(el, hidden) {
		if (!el) return;
		if (hidden) el.setAttribute('hidden', '');
		else el.removeAttribute('hidden');
	}

	function escapeHtml(text) {
		return String(text || '')
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	function getTotalPages(total) {
		return Math.max(4, Math.ceil(total / perPage));
	}

	function setPaginationButtonState(disabled, isActive) {
		var className = 'button small';
		if (isActive) className += ' primary';
		if (disabled) className += ' disabled';
		return className;
	}

	function buildPageButton(label, page, disabled, isActive) {
		var attrs = [
			'href="#"',
			'class="' + setPaginationButtonState(disabled, isActive) + '"'
		];

		if (!disabled && page) {
			attrs.push('data-page="' + page + '"');
		}

		if (disabled) {
			attrs.push('aria-disabled="true"');
		}

		if (isActive) {
			attrs.push('aria-current="page"');
		}

		return '<a ' + attrs.join(' ') + '>' + label + '</a>';
	}

        function openResetModal() {
                if (!resetModalEl) return;
                resetModalEl.classList.add('is-visible');
                resetModalEl.setAttribute('aria-hidden', 'false');
        }

        function closeResetModal() {
                if (!resetModalEl) return;
                resetModalEl.classList.remove('is-visible');
                resetModalEl.setAttribute('aria-hidden', 'true');
        }

        function resetAllVisitors() {
                localStorage.removeItem(USERS_KEY);
                currentPage = 1;
                closeResetModal();
                renderTable();
                showAlert('Data pengunjung sudah berhasil dihapus.');
        }

        function exportCurrentPageToExcel() {
                var state = getCurrentTableState();
                var workbook;
                var worksheet;
                var headerRow;

                if (!state.swk) {
                        showAlert('Pilih SWK terlebih dahulu.');
                        return;
                }

                if (!window.ExcelJS) {
                        showAlert('Fitur unduh Excel belum siap. Coba muat ulang halaman.');
                        return;
                }

                workbook = new window.ExcelJS.Workbook();
                worksheet = workbook.addWorksheet('Pengunjung');
                worksheet.views = [{ state: 'frozen', ySplit: 1 }];
                worksheet.properties.defaultRowHeight = 22;

                worksheet.columns = state.config.headers.map(function (header) {
                        return {
                                header: header,
                                key: header,
                                width: Math.max(header.length + 4, 16)
                        };
                });

                headerRow = worksheet.getRow(1);
                headerRow.height = 24;
                headerRow.eachCell(function (cell) {
                        cell.font = { bold: true, color: { argb: 'FF000000' } };
                        cell.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: 'FFF3F4F8' }
                        };
                        cell.border = {
                                top: { style: 'thin', color: { argb: 'FFDADADA' } },
                                left: { style: 'thin', color: { argb: 'FFDADADA' } },
                                bottom: { style: 'thin', color: { argb: 'FFDADADA' } },
                                right: { style: 'thin', color: { argb: 'FFDADADA' } }
                        };
                        cell.alignment = { vertical: 'middle', horizontal: 'left' };
                });

                state.displayRows.forEach(function (row, index) {
                        var rowValues = buildRowValues(state.offset + index + 1, row, state.config);
                        var excelRow = worksheet.addRow(rowValues);
                        var fillColor = index % 2 === 1 ? 'FFFAFBFF' : 'FFFFFFFF';

                        excelRow.eachCell(function (cell) {
                                cell.font = { color: { argb: 'FF000000' } };
                                cell.fill = {
                                        type: 'pattern',
                                        pattern: 'solid',
                                        fgColor: { argb: fillColor }
                                };
                                cell.border = {
                                        top: { style: 'thin', color: { argb: 'FFE6E6E6' } },
                                        left: { style: 'thin', color: { argb: 'FFE6E6E6' } },
                                        bottom: { style: 'thin', color: { argb: 'FFE6E6E6' } },
                                        right: { style: 'thin', color: { argb: 'FFE6E6E6' } }
                                };
                                cell.alignment = { vertical: 'middle', horizontal: 'left' };
                        });
                });

                workbook.xlsx.writeBuffer().then(function (buffer) {
                        triggerDownload(buffer, getExportFileName(state.currentPage, state.swk));
                        showAlert('File Excel berhasil diunduh.');
                }).catch(function () {
                        showAlert('File Excel gagal diunduh.');
                });
        }

	function renderPagination(totalPages) {
		if (!pagesEl) return;

		var html = '';
		html += buildPageButton('Pertama', 1, currentPage === 1, false);
		html += buildPageButton('Sebelumnya', currentPage - 1, currentPage === 1, false);

		for (var page = 1; page <= 4; page += 1) {
			html += buildPageButton(String(page), page, false, currentPage === page);
		}

		html += buildPageButton('Selanjutnya', currentPage + 1, currentPage === totalPages, false);
                html += '<span class="pagination-bar__last-group">';
                html += buildPageButton('Terakhir', totalPages, currentPage === totalPages, false);
                html += '<button type="button" class="pagination-bar__download" data-download-visitors aria-label="Unduh data pengunjung">';
                html += '<span class="icon solid fa-download" aria-hidden="true"></span>';
                html += '</button>';
                html += '<button type="button" class="pagination-bar__reset" data-reset-visitors aria-label="Reset data pengunjung">';
                html += '<span class="icon solid fa-undo-alt" aria-hidden="true"></span>';
                html += '</button>';
                html += '</span>';
		pagesEl.innerHTML = html;
	}

	function renderTable() {
                var state = getCurrentTableState();
                var swk = state.swk;
		if (!swk) {
			setHidden(titleEl, true);
			setHidden(sortWrapperEl, true);
			setHidden(statisticsActionsEl, true);
			setHidden(containerEl, true);
			setHidden(paginationEl, true);
			return;
		}

		titleEl.textContent = isStatisticsMode ? ('Cek Statistik ' + swk) : ('Tabel Pengunjung ' + swk);
		setHidden(titleEl, false);

		if (isStatisticsMode) {
			setHidden(sortWrapperEl, true);
			setHidden(containerEl, true);
			setHidden(paginationEl, true);
			setHidden(statisticsActionsEl, false);
			return;
		}

		setHidden(sortWrapperEl, false);
		setHidden(statisticsActionsEl, true);
                currentPage = state.currentPage;

                var startNumber = state.offset + 1;
                var endNumber = state.offset + perPage;

		var html = '';
		html += '<div class="table-wrapper">';
		html += '<table class="visitor-table">';
		html += '<thead><tr><th>Nomer</th><th>Nama</th>';
                if (state.config.showAllColumns) {
			html += '<th>Username</th><th>Point</th><th>Nomer Telepon</th><th>Email</th><th>SWK</th>';
		}
                if (state.config.showSwkColumn) {
			html += '<th>SWK</th>';
		}
                if (state.config.showPointColumn) {
			html += '<th>Point</th>';
		}
		html += '</tr></thead>';
		html += '<tbody>';
                state.displayRows.forEach(function (row, index) {
			html += '<tr>';
                        html += '<td>' + escapeHtml(state.offset + index + 1) + '</td>';
			html += '<td>' + escapeHtml(row && row.name ? row.name : 'belum ada pengunjung') + '</td>';
                        if (state.config.showAllColumns) {
				html += '<td>' + escapeHtml(row && row.username ? row.username : 'belum ada pengunjung') + '</td>';
				html += '<td>' + escapeHtml(row ? row.points : 'belum ada pengunjung') + '</td>';
				html += '<td>' + escapeHtml(row && row.phone ? row.phone : 'belum ada pengunjung') + '</td>';
				html += '<td>' + escapeHtml(row && row.email ? row.email : 'belum ada pengunjung') + '</td>';
				html += '<td>' + escapeHtml(row && row.swk ? row.swk : 'belum ada pengunjung') + '</td>';
			}
                        if (state.config.showSwkColumn) {
				html += '<td>' + escapeHtml(row && row.swk ? row.swk : 'belum ada pengunjung') + '</td>';
			}
                        if (state.config.showPointColumn) {
				html += '<td>' + escapeHtml(row ? row.points : 'belum ada pengunjung') + '</td>';
			}
			html += '</tr>';
		});
		html += '</tbody></table></div>';

		containerEl.innerHTML = html;
		setHidden(containerEl, false);

                rangeEl.textContent = 'Page ' + currentPage + ': ' + startNumber + ' of ' + endNumber + ' | Total pengunjung ' + state.total;
                renderPagination(state.totalPages);
		setHidden(paginationEl, false);
	}

	if (pagesEl) {
		pagesEl.addEventListener('click', function (event) {
                        var downloadButton = event.target.closest('[data-download-visitors]');
                        if (downloadButton) {
                                event.preventDefault();
                                exportCurrentPageToExcel();
                                return;
                        }

                        var resetButton = event.target.closest('[data-reset-visitors]');
                        if (resetButton) {
                                event.preventDefault();
                                openResetModal();
                                return;
                        }

			var link = event.target.closest('[data-page]');
			if (!link) return;
			event.preventDefault();
			var page = parseInt(link.getAttribute('data-page'), 10);
			if (!page || page === currentPage) return;
			currentPage = page;
			renderTable();
		});
	}

	if (sortEl) {
		sortEl.addEventListener('change', function () {
			renderTable();
		});
	}

	if (statisticsButtonEl) {
		statisticsButtonEl.addEventListener('click', function (event) {
			event.preventDefault();
                        location.href = 'https://flourish.studio/';
		});
	}

        Array.prototype.forEach.call(resetCloseEls, function (button) {
                button.addEventListener('click', function () {
                        closeResetModal();
                });
        });

        if (resetModalEl) {
                resetModalEl.addEventListener('click', function (event) {
                        if (event.target === resetModalEl) {
                                closeResetModal();
                        }
                });
        }

        if (resetConfirmEl) {
                resetConfirmEl.addEventListener('click', function () {
                        resetAllVisitors();
                });
        }

	document.addEventListener('keydown', function (event) {
                if (event.key === 'Escape' && resetModalEl && resetModalEl.classList.contains('is-visible')) {
                        closeResetModal();
                        return;
                }

                if (resetModalEl && resetModalEl.classList.contains('is-visible')) {
                        return;
                }

		if (event.key === 'ArrowLeft') {
			if (currentPage > 1) {
				currentPage -= 1;
				renderTable();
			}
		}
		if (event.key === 'ArrowRight') {
			var swk = localStorage.getItem(SELECTED_SWK_KEY) || '';
			var users = loadUsers().filter(function (user) {
				return (user && user.swk ? user.swk : '') === swk;
			});
			var totalPages = getTotalPages(users.length);
			if (currentPage < totalPages) {
				currentPage += 1;
				renderTable();
			}
		}
		if (event.key === 'Home') {
			if (currentPage !== 1) {
				currentPage = 1;
				renderTable();
			}
		}
		if (event.key === 'End') {
			if (currentPage !== 4) {
				currentPage = 4;
				renderTable();
			}
		}
	});

	renderTable();
})();
