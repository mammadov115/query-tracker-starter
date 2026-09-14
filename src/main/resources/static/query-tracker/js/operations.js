// operations.js - Database Operations page
var Operations = (function () {

  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function opCls(op) {
    return { 'SELECT': 'op-select', 'INSERT': 'op-insert',
             'UPDATE': 'op-update', 'DELETE': 'op-delete' }[op] || 'op-select';
  }

  var currentTrace = null;

  function open(trace) {
    currentTrace = trace;
    $('#ops-method').text(trace.method).attr('class', 'method-badge method-' + trace.method);
    $('#ops-uri').text(trace.uri);

    var flagsHtml = '';
    if (trace.hasNPlusOne)   flagsHtml += '<span class="itag itag-nplus1">N+1 DETECTED</span>';
    if (trace.hasDuplicates) flagsHtml += '<span class="itag itag-dup">DUPLICATES</span>';
    $('#ops-flags').html(flagsHtml);

    var ops = trace.operations || [];
    var selCount = ops.filter(function(o){ return o.operationType === 'SELECT'; }).length;
    var insCount = ops.filter(function(o){ return o.operationType === 'INSERT'; }).length;
    var updCount = ops.filter(function(o){ return o.operationType === 'UPDATE'; }).length;
    var delCount = ops.filter(function(o){ return o.operationType === 'DELETE'; }).length;

    // filter bar counts
    $('#ops-filter-all').text('All (' + ops.length + ')');
    $('#ops-filter-select').text('SELECT (' + selCount + ')');
    $('#ops-filter-insert').text('INSERT (' + insCount + ')');
    $('#ops-filter-update').text('UPDATE (' + updCount + ')');
    $('#ops-filter-delete').text('DELETE (' + delCount + ')');

    renderOps(ops, 'ALL');
    $('#ops-detail-panel').hide().empty();

    // group tree on left
    renderTree(trace.flowSteps || []);
  }

  function renderTree(steps) {
    var $tree = $('#ops-tree').empty();
    steps.forEach(function (step) {
      var subHtml = (step.operations || []).map(function (op) {
        var dupTag = op.isDuplicate ? ' <span class="qtag qtag-dup">DUP</span>' : '';
        return '<div class="ops-tree-sub" data-label="' + esc(op.index) + '">' +
          '<span class="ops-tree-idx">' + esc(op.index) + '</span>' +
          '<span class="op-badge ' + opCls(op.operationType) + ' op-badge-xs">' + esc(op.operationType) + '</span>' +
          '<span class="ops-tree-sublabel">' + esc(labelFor(op.operationType, step.table)) + '</span>' +
          dupTag +
          '<span class="ops-tree-dur">' + op.durationMs + 'ms</span>' +
        '</div>';
      }).join('');

      $tree.append(
        '<div class="ops-tree-group">' +
          '<div class="ops-tree-header">' +
            '<span class="ops-tree-step">' + step.step + '</span>' +
            '<span class="ops-tree-table">' + esc(step.table) + '</span>' +
            '<span class="ops-tree-count">' + step.queryCount + ' queries</span>' +
            '<span class="ops-tree-dur">' + step.durationMs + 'ms</span>' +
          '</div>' +
          subHtml +
        '</div>'
      );
    });

    // click sub-op in tree -> highlight in right panel
    $tree.off('click', '.ops-tree-sub').on('click', '.ops-tree-sub', function () {
      var label = $(this).data('label');
      $('.ops-tree-sub').removeClass('active');
      $(this).addClass('active');
      var op = findOpByLabel(label);
      if (op) renderDetailPanel(op);
    });
  }

  function findOpByLabel(label) {
    var ops = (currentTrace && currentTrace.operations) || [];
    return ops.find(function(o){ return String(o.index) === String(label); }) || null;
  }

  function labelFor(op, table) {
    var verbs = { SELECT: 'Load', INSERT: 'Create', UPDATE: 'Update', DELETE: 'Delete' };
    return (verbs[op] || op) + ' ' + table;
  }

  function renderOps(ops, filter) {
    var filtered = filter === 'ALL' ? ops : ops.filter(function(o){ return o.operationType === filter; });
    var $list = $('#ops-list').empty();

    filtered.forEach(function (op) {
      var dupTag = op.isDuplicate ? '<span class="qtag qtag-dup">DUP</span>' : '';
      var durColor = op.durationMs < 50 ? 'var(--ok)' : op.durationMs < 200 ? 'var(--warn)' : 'var(--danger)';
      $list.append(
        '<div class="ops-entry" data-idx="' + op.index + '">' +
          '<span class="ops-entry-label">' + esc(String(op.index)) + '</span>' +
          '<span class="op-badge ' + opCls(op.operationType) + '">' + esc(op.operationType) + '</span>' +
          '<span class="ops-entry-table">' + esc(op.table) + '</span>' +
          dupTag +
          '<span class="ops-entry-dur" style="color:' + durColor + '">' + op.durationMs + 'ms</span>' +
        '</div>'
      );
    });

    // click op row -> detail
    $list.off('click', '.ops-entry').on('click', '.ops-entry', function () {
      var idx = $(this).data('idx');
      var op = (currentTrace.operations || []).find(function(o){ return o.index == idx; });
      if (!op) return;
      $('.ops-entry').removeClass('active');
      $(this).addClass('active');
      renderDetailPanel(op);
    });
  }

  function renderDetailPanel(op) {
    var successMsg = op.operationType === 'INSERT'
      ? 'This query successfully created a new record.'
      : op.operationType === 'SELECT'
      ? 'This query successfully retrieved data.'
      : 'This query completed successfully.';

    $('#ops-detail-panel').html(
      '<div class="ops-panel-header">' +
        '<span class="ops-panel-idx">' + esc(String(op.index)) + '</span>' +
        '<span class="op-badge ' + opCls(op.operationType) + '">' + esc(op.operationType) + '</span>' +
        '<span class="ops-panel-table">' + esc(op.table) + '</span>' +
        '<span class="ops-panel-dur">' + op.durationMs + 'ms</span>' +
      '</div>' +
      '<div class="ops-panel-section">' +
        '<div class="dmeta-label">TABLE</div>' +
        '<div class="dmeta-val">' + esc(op.table) + '</div>' +
      '</div>' +
      '<div class="ops-panel-section">' +
        '<div class="dmeta-label">OPERATION</div>' +
        '<div class="dmeta-val">' + esc(op.operationType) + '</div>' +
      '</div>' +
      '<div class="ops-panel-section">' +
        '<div class="dmeta-label">DURATION</div>' +
        '<div class="dmeta-val">' + op.durationMs + 'ms</div>' +
      '</div>' +
      (op.isDuplicate ? '<div class="ops-panel-section"><div class="dmeta-label">DUPLICATE</div><div class="dmeta-val text-danger">' + op.duplicateCount + 'x</div></div>' : '') +
      '<div class="ops-panel-section">' +
        '<div class="dmeta-label">SQL</div>' +
        '<div class="ops-panel-sql">' + esc(op.sql) + '</div>' +
      '</div>' +
      '<div class="ops-panel-success">' + esc(successMsg) + '</div>'
    ).show();
  }

  function initFilters() {
    $(document).on('click', '.ops-filter-btn', function () {
      $('.ops-filter-btn').removeClass('active');
      $(this).addClass('active');
      var filter = $(this).data('filter');
      renderOps((currentTrace && currentTrace.operations) || [], filter);
    });
  }

  return { open: open, initFilters: initFilters };
})();
