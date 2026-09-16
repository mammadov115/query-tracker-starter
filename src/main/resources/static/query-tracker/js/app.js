// app.js
$(function () {

  var refreshTimer   = null;
  var isLive         = false;
  var currentTraceId = null;

  List.init();
  Operations.initFilters();

  function load() {
    List.loadPage(List.getCurrentPage());
  }

  function setAutoRefresh(ms) {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = null;
    if (ms > 0) refreshTimer = setInterval(load, ms);
  }

  function hideAllPages() {
    $('#page-list, #page-inspect, #page-overview, #page-flow, #page-operations').addClass('hidden');
  }

  function setActiveTab(tab) {
    $('.detail-tab').removeClass('active');
    $('.detail-tab[data-tab="' + tab + '"]').addClass('active');
  }

  function openDetailPage(tab) {
    if (!currentTraceId) return;
    Api.getTrace(currentTraceId, function (trace) {
      hideAllPages();
      setActiveTab(tab);
      if (tab === 'overview') {
        $('#page-overview').removeClass('hidden');
        Overview.open(trace);
      } else if (tab === 'flow') {
        $('#page-flow').removeClass('hidden');
        Flow.open(trace);
      } else if (tab === 'operations') {
        $('#page-operations').removeClass('hidden');
        Operations.open(trace);
      }
    });
  }

  function openTrace(id) {
    if (!id) return;
    currentTraceId = id;
    hideAllPages();
    setActiveTab('overview');
    $('#page-overview').removeClass('hidden');
    Api.getTrace(id, function (detailed) {
      Overview.open(detailed);
    });
  }

  $(document).on('click', '.btn-inspect', function (e) {
    e.stopPropagation();
    openTrace($(this).data('id'));
  });

  $(document).on('click', '.req-row', function (e) {
    if ($(e.target).closest('.btn-inspect').length) return;
    openTrace($(this).data('id'));
  });

  $(document).on('click', '.detail-tab', function () {
    openDetailPage($(this).data('tab'));
  });

  $(document).on('click', '.detail-back', function () {
    hideAllPages();
    $('#page-list').removeClass('hidden');
    currentTraceId = null;
  });

  $('#btn-back').on('click', function () {
    Inspect.close();
  });

  $('#btn-refresh').on('click', load);

  $('#btn-live').on('click', function () {
    isLive = !isLive;
    if (isLive) {
      $(this).addClass('active').find('.live-dot').css('background', 'var(--ok)');
      setAutoRefresh(parseInt($('#refresh-interval').val()) || 5000);
    } else {
      $(this).removeClass('active');
      setAutoRefresh(0);
    }
  });

  $('#refresh-interval').on('change', function () {
    if (isLive) setAutoRefresh(parseInt($(this).val()) || 0);
  });

  $('#btn-live').trigger('click');

  List.loadPage(0);
});
