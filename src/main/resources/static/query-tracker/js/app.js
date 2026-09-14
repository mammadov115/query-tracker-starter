// app.js
$(function () {

  var refreshTimer = null;
  var isLive = false;

  List.init();

  function load() {
    Api.getTraces(function (traces) {
      List.render(traces);
    });
  }

  function setAutoRefresh(ms) {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = null;
    if (ms > 0) refreshTimer = setInterval(load, ms);
  }

  $('#btn-refresh').on('click', load);

  $('#btn-live').on('click', function () {
    isLive = !isLive;
    if (isLive) {
      $(this).addClass('active').find('.live-dot').css('background','var(--ok)');
      setAutoRefresh(parseInt($('#refresh-interval').val()) || 5000);
    } else {
      $(this).removeClass('active');
      setAutoRefresh(0);
    }
  });

  $('#refresh-interval').on('change', function () {
    if (isLive) setAutoRefresh(parseInt($(this).val()) || 0);
  });

  $('#btn-back').on('click', function () {
    Inspect.close();
  });

  // start live by default
  $('#btn-live').trigger('click');

  load();
});
