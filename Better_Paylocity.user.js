// ==UserScript==
// @name        Better Paylocity
// @namespace   betterui
// @description Improvements to the Paylocity UI
// @include     https://webtime2.paylocity.com/webtime/Employee/Timesheet
// @include     https://webtime2.paylocity.com/webtime/Employee/Timesheet#
// @downloadURL https://raw.githubusercontent.com/Anthropohedron/better-paylocity/master/Better_Paylocity.user.js
// @version     0.2.0
// @grant       GM_addStyle
// @grant       unsafeWindow
// ==/UserScript==

(function(win) {

var $ = win.jQuery;

// the page can't call functions defined in this context, so export to the
// page
function ef(fn) { return exportFunction(fn, win); }

// run the function in the context of the window
function winEval(fn) {
  win.eval('('+fn.toString()+')();');
}

winEval(function wc_setChargeCode() {

  window.emptyChargeCodeLabel = 'Unassigned';
  window.chargeCodeSuffix = '//////////////';

  window.setChargeCode = function setChargeCode(chargeCode, value) {
    chargeCode = $(chargeCode);
    if (!value) value = chargeCodeSuffix;
    var select = chargeCode.find('select')[0];

    if (select) {
      select.value = value;
    } else {
      select = chargeCode.find('input')[0];
      if (select) {
        select.value = value;
        chargeCode.find('label').html(emptyChargeCodeLabel);
      }
    }
  }

});

// fix up charge codes (in the window context)
winEval(function wc_payType() {

  var payTypeRE = /PayTypeId$/;

  function onPayTypeChanged() {
    var chargeCode = $("#" + this.id.replace(payTypeRE, 'LaborLevel'));
    if (this.value == 9) {
      chargeCode.show();
    } else {
      chargeCode.hide();
      setChargeCode(chargeCode);
    }
  };

  // watch pay type to hide charge code when not Worked
  $(document).on('change',
      'select[id^=TimeSheet_][id*=__Entries_][id$=__PayTypeId]',
      onPayTypeChanged);
});

winEval(function wc_defaultWorked() {

  var payTypeRE = /PayTypeId$/;

  var fakeSelectedEntryRow = null;
  function fakeGetSelectedEntryRow() {
    return fakeSelectedEntryRow;
  }

  // exported function to be called by jQuery's each
  function eachWorked() {
    var select = $(this);
    if (select.val() == 0) {
      var realGetSelectedEntryRow = window.getSelectedEntryRow;
      window.getSelectedEntryRow = fakeGetSelectedEntryRow;
      fakeSelectedEntryRow = select.parents('tr.pay-type-description');
      select.val(9).trigger('change');
      window.getSelectedEntryRow = realGetSelectedEntryRow;
    }
  };

  // make any row with an unset "Pay Type" column default to "Worked"
  window.defaultWorked = function defaultWorked() {
    $('tr.pay-type-description > td > select')
      .each(eachWorked);
  }

});

// display an add row button (in the window context)
winEval(function wc_addRow() {
  // make custom Add Row button markup to be used later
  var addRowBtn = $.parseHTML([
    '<div id="myAddRowBtn" class="t-link">',
      '<span class="t-sprite p-tool-add"></span>',
      'Add&nbsp;Row',
    '</div>'
  ].join(''))[0];

  // attach handlers to the Add Row button click
  $(addRowBtn).on('click', addShift);

  // wrap row selection to place the Add Row button at the associated day
  var wrappedOnSelect = selectEntryRow;
  selectEntryRow = function wrapOnSelect(row) {
    // call wrapped function
    var result = wrappedOnSelect(row);
    // get the newly-selected row
    var row = getSelectedEntryRow();
    if (row) {
      // if it's appropriate, add the Add Row button near the row
      row.parents('.day-end').prev('td.day').append(addRowBtn);
    } else {
      // no appropriate row, so make sure the Add Row button is gone
      $(addRowBtn).detach();
    }
    return result;
  }

});

// fix up charge codes (in the window context)
winEval(function wc_chargeCode() {

  var chargeCodeOptions = '<option value="' +
    chargeCodeSuffix +
    '" selected="selected">' +
    emptyChargeCodeLabel +
    '</option>';

  function replaceChargeCode() {
    var value = this.value;
    var chargeCode = $(this).parents('.p-widget');
    var html = [
      '<select class="p-select" name="',
      this.name,
      '" id="',
      this.id,
      '">\n',
      chargeCodeOptions,
      '</select>'
    ].join('');
    chargeCode.html(html);
    setChargeCode(chargeCode, value);
  }

  var pendingDomChange = false;
  function onDomChange() {
    $('.p-widget[id^=TimeSheet_][id*=__Entries_][id$=__LaborLevel] input')
      .each(replaceChargeCode);
    defaultWorked();
    pendingDomChange = false;
  }

  function delayedDomChange() {
    if (pendingDomChange) return;
    pendingDomChange = true;
    window.setTimeout(onDomChange, 1);
  }

  function onSuccess(data) {
    var items = $($.parseHTML(data))
      .find('#LaborLevelGrid0 > .t-grid-content > table > tbody > tr > td')
      .map(function() { return $(this).text(); })
      .toArray();
    var i, len = items.length;
    var options = [
      '<option value="',
      chargeCodeSuffix,
      '">',
      emptyChargeCodeLabel,
      '</option>'
    ];

    for (i=0; i<len; i += 2) {
      if (items[i].trim()) {
        options.push(
            '<option value="',
            items[i],
            chargeCodeSuffix,
            '">',
            items[i+1],
            '</option>'
            );
      }
    }
    chargeCodeOptions = options.join('');

    var observer = new MutationObserver(function(mutations) {
      var i, len = mutations.length;
      for (i=0; i<len; ++i) {
        if (mutations[i].addedNodes.length) {
          delayedDomChange();
          return;
        }
      }
    });

    onDomChange();
    observer.observe(document.body, {
      subtree: true,
      childList: true
    });
  }

  $(document).ready(function chargeCodeOnReady() {
    var url = $('#TimeSheet_0__Entries_0__LaborLevel')
      .data('pPopupWindow')
      .getPopupUrl();
    var config = {
      type:"GET",
      url: url,
      dataType:"html",
      success: onSuccess
    };
    $.ajax(config);
  });

});

// hide the "Update Charge Codes" button, which doesn't work on the charge
// code select but is much less needed because of that change
$('#TimesheetToolbar .t-sprite.p-tool-ll-info').parents('li').hide();

// set up some CSS
GM_addStyle([
    // just let the page do the scrolling
    'div#TimesheetContainer { max-height: none; } ',
    // make the Add Row button look good
    '#myAddRowBtn {',
       'background: #DEF1FA;',
       'margin-top: 10px;',
       'border: 1px solid;',
       'padding: 3px;',
       'border-radius: 8px;',
    '} ',
    '#myAddRowBtn .t-sprite {',
       'margin-right: 3px;',
    '} '
  ].join(''));

})(unsafeWindow, unsafeWindow.document);

