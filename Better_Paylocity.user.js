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

(function(win, doc) {

var $ = win.jQuery;

// the page can't call functions defined in this context, so export to the
// page
function ef(fn) { return exportFunction(fn, win); }

var payTypeRE = /PayTypeId$/;
var emptyChargeCodeLabel = 'Unassigned';
win.emptyChargeCodeLabel = emptyChargeCodeLabel;
var chargeCodeSuffix = '//////////////';
win.chargeCodeSuffix = chargeCodeSuffix;

var onPayTypeChanged = ef(function onPayTypeChanged() {
  var chargeCode = $("#" + this.id.replace(payTypeRE, 'LaborLevel'));
  if (this.value == 9) {
    chargeCode.show();
  } else {
    chargeCode.hide();
  }
});

// exported function to be called by jQuery's each
var eachWorked = ef(function eachWorked() { this.value = 9; });

// make any row with an unset "Pay Type" column default to "Worked"
function defaultWorked() {
  $('tr.pay-type-description > td > select > option[value=0][selected]')
    .parent()
    .each(eachWorked);
}

// make custom Add Row button markup to be used later
var addRowBtn = $.parseHTML([
    '<div id="myAddRowBtn" class="t-link">',
      '<span class="t-sprite p-tool-add"></span>',
      'Add&nbsp;Row',
    '</div>'
  ].join(''))[0];

// attach handlers to the Add Row button click
$(addRowBtn)
  .click(win.addShift)
  .click(ef(defaultWorked));

function runInWindowContext() {

  var chargeCodeOptions =
    '<option value="//////////////" selected="selected">Unassigned</option>';

  function replaceChargeCode() {
    var value = this.value;
    var chargeCode = $(this).parents('.p-widget');
    var html = [
      '<select name="',
      this.name,
      ' id="',
      this.id,
      '">\n',
      chargeCodeOptions,
      '</select>'
    ].join('');
    chargeCode.html(html)
      .find('input')
      .value(value);
  }

  function replaceAllChargeCodes() {
    $('.p-widget[id^=TimeSheet_][id*=__Entries_][id$=__LaborLevel] input')
      .each(replaceChargeCode);
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
    replaceAllChargeCodes();
  }

  $(document).ready(function onReady() {
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

}
win.eval('('+runInWindowContext.toString()+')();');


$(doc).on('change',
    'select[id^=TimeSheet_][id*=__Entries_][id$=__PayTypeId]',
    onPayTypeChanged);

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

// default all unset rows to Worked
defaultWorked();

// wrap row selection to place the Add Row button at the associated day
var wrappedOnSelect = win.selectEntryRow;
function wrapOnSelect(row) {
  // call wrapped function
  var result = wrappedOnSelect(row);
  // get the newly-selected row
  var row = win.getSelectedEntryRow();
  if (row) {
    // if it's appropriate, add the Add Row button near the row
    row.parents('.day-end').prev('td.day').append(addRowBtn);
  } else {
    // no appropriate row, so make sure the Add Row button is gone
    $(addRowBtn).remove();
  }
  return result;
}
win.selectEntryRow = ef(wrapOnSelect);

})(unsafeWindow, unsafeWindow.document);

