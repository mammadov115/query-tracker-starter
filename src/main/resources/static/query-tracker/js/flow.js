// flow.js - Execution Flow page
var Flow = (function () {

  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function opBadge(op) {
    var cls = { 'SELECT': 'op-select', 'INSERT': 'op-insert',
                'UPDATE': 'op-update', 'DELETE': 'op-delete' }[op] || 'op-select';
    return '<span class="op-badge ' + cls + '">' + esc(op) + '</span>';
  }

  var currentTrace = null;

  function open(trace) {
    currentTrace = trace;
    $('#fl-method').text(trace.method).attr('class', 'method-badge method-' + trace.method);
    $('#fl-uri').text(trace.uri);

    var flagsHtml = '';
    if (trace.hasNPlusOne)   flagsHtml += '<span class="itag itag-nplus1">N+1 DETECTED</span>';
    if (trace.hasDuplicates) flagsHtml += '<span class="itag itag-dup">DUPLICATES</span>';
    $('#fl-flags').html(flagsHtml);

    renderSteps(trace.flowSteps || []);
    $('#fl-detail-panel').hide().empty();
  }

  function renderSteps(steps) {
    var $flow = $('#fl-flow-steps').empty();

    steps.forEach(function (step, idx) {
      var isLast = idx === steps.length - 1;

      var subOpsHtml = (step.operations || []).map(function (op) {
        var dupTag = op.isDuplicate ? '<span class="qtag qtag-dup">DUP</span>' : '';
        return '<div class="fl-subop" data-table="' + esc(step.table) + '" data-stepidx="' + idx + '">' +
          opBadge(op.operationType) +
          '<span class="fl-subop-label">' + esc(op.operationType.charAt(0) + op.operationType.slice(1).toLowerCase()) + ' ' + esc(step.table) + '</span>' +
          dupTag +
          '<span class="fl-subop-dur">' + op.durationMs + 'ms</span>' +
        '</div>';
      }).join('');

      var stepHtml =
        '<div class="fl-step-wrap">' +
          '<div class="fl-step-num">' + step.step + '</div>' +
          '<div class="fl-step-card" data-stepidx="' + idx + '">' +
            '<div class="fl-step-header">' +
              '<span class="fl-step-table">' + esc(step.table) + '</span>' +
              '<span class="fl-step-badge">' + step.queryCount + ' queries</span>' +
              '<span class="fl-step-dur">' + step.durationMs + 'ms</span>' +
            '</div>' +
            '<div class="fl-subops">' + subOpsHtml + '</div>' +
          '</div>' +
        '</div>' +
        (!isLast ? '<div class="fl-connector"></div>' : '');

      $flow.append(stepHtml);
    });

    // click step -> show detail panel
    $flow.off('click', '.fl-step-card').on('click', '.fl-step-card', function () {
      var idx = parseInt($(this).data('stepidx'));
      var step = (currentTrace.flowSteps || [])[idx];
      if (!step) return;
      $('.fl-step-card').removeClass('active');
      $(this).addClass('active');
      renderDetailPanel(step);
    });
  }

  function renderDetailPanel(step) {
    var $panel = $('#fl-detail-panel');

    var opsHtml = (step.operations || []).map(function (op, i) {
      var dupTag = op.isDuplicate ? '<span class="qtag qtag-dup">DUP</span>' : '';
      return '<div class="fl-panel-op">' +
        '<div class="fl-panel-op-header">' +
          '<span class="fl-panel-op-num">' + (i + 1) + '</span>' +
          '<span class="op-badge ' + opCls(op.operationType) + '">' + esc(op.operationType) + '</span>' +
          '<span class="fl-panel-op-title">' + opLabel(op.operationType) + ' ' + esc(step.table) + '</span>' +
          dupTag +
          '<span class="fl-panel-op-dur">' + op.durationMs + 'ms</span>' +
        '</div>' +
        '<div class="fl-panel-sql">' + esc(op.sql) + '</div>' +
      '</div>';
    }).join('');

    var summaryHtml =
      '<div class="fl-panel-summary">' +
        '<div class="fl-panel-summary-item"><span class="dmeta-label">TOTAL QUERIES</span><span class="dmeta-val">' + step.queryCount + '</span></div>' +
        '<div class="fl-panel-summary-item"><span class="dmeta-label">TOTAL DURATION</span><span class="dmeta-val">' + step.durationMs + 'ms</span></div>' +
      '</div>';

    $panel.html(
      '<div class="fl-panel-title">' + esc(step.table) + ' <span class="fl-panel-subtitle">' + step.queryCount + ' operations</span></div>' +
      opsHtml +
      summaryHtml
    ).show();
  }

  function opCls(op) {
    return { 'SELECT': 'op-select', 'INSERT': 'op-insert',
             'UPDATE': 'op-update', 'DELETE': 'op-delete' }[op] || 'op-select';
  }

  function opLabel(op) {
    var labels = { 'SELECT': 'Load', 'INSERT': 'Create', 'UPDATE': 'Update', 'DELETE': 'Delete' };
    return labels[op] || op;
  }

  return { open: open };
})();
