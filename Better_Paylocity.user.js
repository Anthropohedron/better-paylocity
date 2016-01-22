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

var payTypeSuffix = /PayTypeId$/;

var onPayTypeChanged = ef(function onPayTypeChanged() {
  var chargeCode = $("#" + this.id.replace(payTypeSuffix, 'LaborLevel'));
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

var chargeCodeDropdown = null;

var replaceChargeCode = ef(function replaceChargeCode() {
  var chargeCode = $(this);
  //TODO
});

$.ajax({
  type:"GET",
  url: $('#TimeSheet_0__Entries_0__LaborLevel')
    .data('pPopupWindow')
    .getPopupUrl(),
  dataType:"html",
  success: function(data) {
    chargeCodeDropdown = $($.parseHTML(data)).find('#LaborLevelEdit0');
    win.$('.p-widget.p-filtercontrol[id^=TimeSheet_][id*=__Entries_][id$=__LaborLevel]').each(replaceChargeCode);
  }
});


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

