// api.js
var Api = (function () {
  var BASE = '/query-tracker/api';

  function getTraces(onSuccess) {
    $.ajax({
      url: BASE + '/traces',
      method: 'GET',
      success: function (res) {
        if (res.status === 'success') onSuccess(res.data.traces);
      },
      error: function () {}
    });
  }

  function clearTraces(onSuccess) {
    $.ajax({
      url: BASE + '/traces',
      method: 'DELETE',
      success: function () { if (onSuccess) onSuccess(); },
      error: function () {}
    });
  }

  return { getTraces: getTraces, clearTraces: clearTraces };
})();
