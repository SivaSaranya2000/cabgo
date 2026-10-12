$(function () {

  /* ================= SETTINGS ================= */
  var WHATSAPP_NUMBER = '919999999999';          // change to your number (country code + number)
  var RATES = { hatchback: 11, sedan: 13, suv: 18, tempo: 26 };   // ₹ per km
  var MIN_KM = { Local: 0, 'One-way': 0, 'Round trip': 250 };      // minimum km billed per round trip
  var BASE_FEE = 50;                                              // pickup fee
  var SNOOZE_DAYS = 3;                                            // "Not now" hides popup for these days

  /* ================= INSTALL (PWA) POPUP ================= */
  var STORE_KEY = 'cabgo_install';   // 'installed' or 'snooze:<timestamp>'
  var deferredPrompt = null;

  var isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  var isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

  function getState() { try { return localStorage.getItem(STORE_KEY) || ''; } catch (e) { return ''; } }
  function setState(v) { try { localStorage.setItem(STORE_KEY, v); } catch (e) {} }

  function shouldShowPopup() {
    if (isStandalone) return false;                       // already running as app
    var s = getState();
    if (s === 'installed') return false;                  // installed before: open site directly
    if (s.indexOf('snooze:') === 0) {
      var until = parseInt(s.split(':')[1], 10);
      if (Date.now() < until) return false;
    }
    return true;
  }

  // Register service worker (needed for install)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function (err) { console.warn('SW failed', err); });
    });
  }

  // Chrome / Edge / Samsung browser fire this when the site can be installed
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    if (getState() !== 'installed') $('#btnFooterInstall').removeClass('d-none');
  });

  window.addEventListener('appinstalled', function () {
    setState('installed');
    deferredPrompt = null;
    $('#btnFooterInstall').addClass('d-none');
  });

  var modalEl = document.getElementById('installModal');
  var installModal = new bootstrap.Modal(modalEl);

  function resetModal() {
    $('#iosSteps, #manualSteps, #closeButtonWrap').addClass('d-none');
    $('#installButtons').removeClass('d-none');
  }

  function doInstall() {
    if (deferredPrompt) {
      installModal.hide();
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function (choice) {
        if (choice.outcome === 'accepted') setState('installed');
        else setState('snooze:' + (Date.now() + SNOOZE_DAYS * 864e5));
        deferredPrompt = null;
      });
      return;
    }
    // No automatic prompt available: show manual steps
    $('#installButtons').addClass('d-none');
    $('#closeButtonWrap').removeClass('d-none');
    $('#installText').text('Almost done. Follow these steps:');
    if (isIos) $('#iosSteps').removeClass('d-none');
    else $('#manualSteps').removeClass('d-none');
  }

  $('#btnInstallYes').on('click', doInstall);

  $('#btnInstallNo').on('click', function () {
    setState('snooze:' + (Date.now() + SNOOZE_DAYS * 864e5));
    installModal.hide();
  });

  $('#btnInstallClose').on('click', function () {
    setState('snooze:' + (Date.now() + SNOOZE_DAYS * 864e5));
    installModal.hide();
  });

  $('#btnFooterInstall').on('click', function () {
    resetModal();
    $('#installText').text('Book faster from your home screen.');
    installModal.show();
  });

  // Show popup a moment after the site opens
  if (shouldShowPopup()) {
    setTimeout(function () { installModal.show(); }, 1200);
  }

  /* ================= BOOKING FORM ================= */
  var today = new Date().toISOString().split('T')[0];
  $('#date').attr('min', today).val(today);
  $('#year').text(new Date().getFullYear());

  function estimate() {
    var km = parseFloat($('#km').val());
    if (!km || km <= 0) return 0;
    var type = $('input[name="tripType"]:checked').val();
    var billedKm = km;
    if (type === 'Round trip') billedKm = Math.max(km * 2, MIN_KM['Round trip']);
    return Math.round(BASE_FEE + billedKm * RATES[$('#cabType').val()]);
  }

  function updateMeter() {
    var fare = estimate();
    $('#fareMeter').text(fare ? '₹ ' + fare.toLocaleString('en-IN') : '₹ 0');
  }

  $('#km, #cabType, input[name="tripType"]').on('input change', updateMeter);

  $('#bookingForm').on('submit', function (e) {
    e.preventDefault();
    var pickup = $.trim($('#pickup').val());
    var drop = $.trim($('#drop').val());
    var date = $('#date').val();
    var time = $('#time').val();
    var phone = $.trim($('#phone').val());
    var $err = $('#formError');

    if (!pickup || !drop || !date || !time) {
      return $err.text('Please fill pickup, drop, date and time.').removeClass('d-none');
    }
    if (!/^[0-9]{10}$/.test(phone)) {
      return $err.text('Enter a valid 10-digit mobile number.').removeClass('d-none');
    }
    $err.addClass('d-none');

    var fare = estimate();
    var msg = 'New cab booking\n' +
      'Trip: ' + $('input[name="tripType"]:checked').val() + '\n' +
      'Pickup: ' + pickup + '\n' +
      'Drop: ' + drop + '\n' +
      'Date: ' + date + ' ' + time + '\n' +
      'Cab: ' + $('#cabType option:selected').text() + '\n' +
      (fare ? 'Estimated fare: Rs. ' + fare + '\n' : '') +
      'Mobile: ' + phone;

    window.open('https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(msg), '_blank');
  });

  /* Smooth scroll for in-page links + close mobile menu */
  $('a[href^="#"]').on('click', function (e) {
    var target = $(this.getAttribute('href'));
    if (target.length) {
      e.preventDefault();
      $('html, body').animate({ scrollTop: target.offset().top - 64 }, 350);
      $('#nav').collapse('hide');
    }
  });
});
