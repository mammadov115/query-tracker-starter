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

  function buildCopyText(trace) {
    var lines = [];
    lines.push('Request: ' + trace.method + ' ' + trace.uri);
    lines.push('Duration: ' + trace.durationMs + 'ms  |  Queries: ' + trace.queryCount);
    if (trace.hasNPlusOne)   lines.push('WARNING: N+1 detected');
    if (trace.hasDuplicates) lines.push('WARNING: Duplicate queries detected');
    lines.push('');

    var globalIdx = 1;
    (trace.flowSteps || []).forEach(function (step) {
      (step.operations || []).forEach(function (op) {
        var dupNote = op.isDuplicate ? ' [DUPLICATE x' + op.duplicateCount + ']' : '';
        lines.push('-- Query #' + globalIdx + ' | ' + op.operationType + ' | ' + step.table + ' | ' + op.durationMs + 'ms' + dupNote);
        lines.push(op.sql || '');
        lines.push('');
        globalIdx++;
      });
    });

    return lines.join('\n');
  }

  function renderSteps(steps) {
    var $flow = $('#fl-flow-steps').empty();

    steps.forEach(function (step, idx) {
      var isLast = idx === steps.length - 1;

      var subOpsHtml = (step.operations || []).map(function (op, opIdx) {
        var dupTag = op.isDuplicate ? '<span class="qtag qtag-dup">DUP</span>' : '';
        return '<div class="fl-subop" data-stepidx="' + idx + '" data-opidx="' + opIdx + '">' +
          opBadge(op.operationType) +
          '<span class="fl-subop-label">' + esc(op.label || (op.operationType.charAt(0) + op.operationType.slice(1).toLowerCase() + ' ' + step.table)) + '</span>' +
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

    // card header click -> open detail panel, no highlight
    $flow.off('click', '.fl-step-card').on('click', '.fl-step-card', function (e) {
      if ($(e.target).closest('.fl-subop').length) return;
      var idx = parseInt($(this).data('stepidx'));
      var step = (currentTrace.flowSteps || [])[idx];
      if (!step) return;
      $('.fl-step-card').removeClass('active');
      $(this).addClass('active');
      renderDetailPanel(step, -1);
    });

    // subop click -> open panel and scroll+highlight the matching right-side block
    $flow.off('click', '.fl-subop').on('click', '.fl-subop', function (e) {
      e.stopPropagation();
      var stepIdx = parseInt($(this).data('stepidx'));
      var opIdx   = parseInt($(this).data('opidx'));
      var step = (currentTrace.flowSteps || [])[stepIdx];
      if (!step) return;
      $('.fl-step-card').removeClass('active');
      $(this).closest('.fl-step-card').addClass('active');
      renderDetailPanel(step, opIdx);
    });
  }

  function renderDetailPanel(step, highlightOpIdx) {
    var $panel = $('#fl-detail-panel');

    // build copy button for the title row
    var titleHtml =
      '<div class="fl-panel-title">' +
        '<div class="fl-panel-title-left">' +
          '<span class="fl-panel-title-table">' + esc(step.table) + '</span>' +
          '<span class="fl-panel-subtitle">' + step.queryCount + ' operations</span>' +
        '</div>' +
        '<button class="btn-copy fl-copy-all-btn" title="Copy all SQLs for this request">Copy all SQLs</button>' +
      '</div>';

    var opsHtml = (step.operations || []).map(function (op, i) {
      var dupTag = op.isDuplicate ? '<span class="qtag qtag-dup">DUP</span>' : '';
      return '<div class="fl-panel-op" data-panelop="' + i + '">' +
        '<div class="fl-panel-op-header">' +
          '<span class="fl-panel-op-num">' + (i + 1) + '</span>' +
          '<span class="op-badge ' + opCls(op.operationType) + '">' + esc(op.operationType) + '</span>' +
          '<span class="fl-panel-op-title">' + esc(op.label || (opLabel(op.operationType) + ' ' + step.table)) + '</span>' +
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

    $panel.html(titleHtml + opsHtml + summaryHtml).show();

    // copy all button handler
    $panel.find('.fl-copy-all-btn').off('click').on('click', function () {
      if (!currentTrace) return;
      var $btn = $(this);
      navigator.clipboard.writeText(buildCopyText(currentTrace)).then(function () {
        $btn.text('Copied!').addClass('fl-copy-btn-ok');
        setTimeout(function () {
          $btn.text('Copy all SQLs').removeClass('fl-copy-btn-ok');
        }, 1800);
      });
    });

    if (highlightOpIdx >= 0) {
      var $target = $panel.find('[data-panelop="' + highlightOpIdx + '"]');
      if (!$target.length) return;

      var $scrollContainer = $panel.closest('.fl-right');
      var targetTop = $target[0].offsetTop;

      $scrollContainer.animate({ scrollTop: targetTop - 12 }, 180, function () {
        $target.addClass('fl-panel-op-highlight');
        setTimeout(function () {
          $target.addClass('fl-panel-op-highlight-fade');
          setTimeout(function () {
            $target.removeClass('fl-panel-op-highlight fl-panel-op-highlight-fade');
          }, 600);
        }, 1000);
      });
    }
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
