// app.js
$(function () {

  var refreshTimer = null;
  var isLive = false;
  var currentTraceId = null;

  List.init();
  Operations.initFilters();

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

  function hideAllPages() {
    $('#page-list, #page-inspect, #page-overview, #page-flow, #page-operations').addClass('hidden');
  }

  // open a detail page (overview/flow/operations) for a traceId
  function openDetailPage(tab) {
    if (!currentTraceId) return;
    Api.getTrace(currentTraceId, function (trace) {
      hideAllPages();
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

  // INSPECT button -> go to overview by default
  $(document).on('click', '.btn-inspect', function (e) {
    e.stopPropagation();
    var id = $(this).data('id');
    var trace = window._tracesById && window._tracesById[id];
    currentTraceId = id;
    if (trace) {
      // legacy inspect still accessible via existing Inspect.open
      hideAllPages();
      $('#page-overview').removeClass('hidden');
      Api.getTrace(id, function (detailed) {
        Overview.open(detailed);
      });
    }
  });

  // tab switching (shared across overview/flow/operations pages)
  $(document).on('click', '.detail-tab', function () {
    var tab = $(this).data('tab');
    openDetailPage(tab);
  });

  // back button on any detail page -> list
  $(document).on('click', '.detail-back', function () {
    hideAllPages();
    $('#page-list').removeClass('hidden');
    currentTraceId = null;
  });

  // legacy inspect back
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

  // start live by default
  $('#btn-live').trigger('click');

  load();
});
