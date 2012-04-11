﻿/// CODE

var DoubleUtil = {};
DoubleUtil.AreClose = function (val1, val2) {
    if (val1 === val2)
        return true;
    var num1 = (Math.abs(val1) + Math.abs(val2) + 10) * 1.11022302462516E-16;
    var num2 = val1 - val2;
    return -num1 < num2 && num1 > num2;
};