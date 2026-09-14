// app.js - bootstrap and auto-refresh

$(function () {

  var REFRESH_MS = 5000;

  // prepend live dot to refresh indicator
  $('#refresh-indicator').html(
    '<span class="refresh-dot"></span>auto-refresh 5s'
  );

  function refresh() {
    Api.getTraces(function (traces) {
      Render.stats(traces);
      Render.table(traces);
    });
  }

  $('#btn-clear').on('click', function () {
    Api.clearTraces(function () {
      refresh();
    });
  });

  // initial load + interval
  refresh();
  setInterval(refresh, REFRESH_MS);

});
