'use strict';

var md5 = require('../lib/md5');
var CryptoJS = require('../lib/crypto');
var xml2json = require('../lib/xml2json');
var json2xml = require('../lib/json2xml');

function camSafeUrlEncode(str) {
    return encodeURIComponent(str)
        .replace(/!/g, '%21')
        .replace(/'/g, '%27')
        .replace(/\(/g, '%28')
        .replace(/\)/g, '%29')
        .replace(/\*/g, '%2A');
}

//测试用的key后面可以去掉
var getAuth = function (opt) {
    opt = opt || {};

    var SecretId = opt.SecretId;
    var SecretKey = opt.SecretKey;
    var method = (opt.method || opt.Method || 'get').toLowerCase();
    var pathname = opt.pathname || opt.Key || '/';
    var queryParams = opt.params || '';
    var headers = opt.headers || '';
    pathname.indexOf('/') !== 0 && (pathname = '/' + pathname);

    if (!SecretId) return console.error('lack of param SecretId');
    if (!SecretKey) return console.error('lack of param SecretKey');

    var getObjectKeys = function (obj) {
        var list = [];
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                list.push(key);
            }
        }
        return list.sort();
    };

    var obj2str = function (obj) {
        var i, key, val;
        var list = [];
        var keyList = getObjectKeys(obj);
        for (i = 0; i < keyList.length; i++) {
            key = keyList[i];
            val = obj[key] || '';
            key = key.toLowerCase();
            list.push(camSafeUrlEncode(key) + '=' + camSafeUrlEncode(val));
        }
        return list.join('&');
    };

    // 签名有效起止时间
    var now = parseInt(new Date().getTime() / 1000) - 1;
    var exp = now;

    var Expires = opt.Expires || opt.expires;
    if (Expires === undefined) {
        exp += 900; // 签名过期时间为当前 + 900s
    } else {
        exp += (Expires * 1) || 0;
    }

    // 要用到的 Authorization 参数列表
    var qSignAlgorithm = 'sha1';
    var qAk = SecretId;
    var qSignTime = now + ';' + exp;
    var qKeyTime = now + ';' + exp;
    var qHeaderList = getObjectKeys(headers).join(';').toLowerCase();
    var qUrlParamList = getObjectKeys(queryParams).join(';').toLowerCase();

    // 签名算法说明文档：https://www.qcloud.com/document/product/436/7778
    // 步骤一：计算 SignKey
    var signKey = CryptoJS.HmacSHA1(qKeyTime, SecretKey).toString();

    // 步骤二：构成 FormatString
    var formatString = [method, pathname, obj2str(queryParams), obj2str(headers), ''].join('\n');

    // 步骤三：计算 StringToSign
    var stringToSign = ['sha1', qSignTime, CryptoJS.SHA1(formatString).toString(), ''].join('\n');

    // 步骤四：计算 Signature
    var qSignature = CryptoJS.HmacSHA1(stringToSign, signKey).toString();

    // 步骤五：构造 Authorization
    var authorization = [
        'q-sign-algorithm=' + qSignAlgorithm,
        'q-ak=' + qAk,
        'q-sign-time=' + qSignTime,
        'q-key-time=' + qKeyTime,
        'q-header-list=' + qHeaderList,
        'q-url-param-list=' + qUrlParamList,
        'q-signature=' + qSignature
    ].join('&');

    return authorization;

};

// 清除对象里值为的 undefined 或 null 的属性
var clearKey = function (obj) {
    var retObj = {};
    for (var key in obj) {
        if (obj[key] !== undefined && obj[key] !== null) {
            retObj[key] = obj[key];
        }
    }
    return retObj;
};

var readAsBinaryString = function (blob, callback) {
    var readFun;
    var fr = new FileReader();
    if (FileReader.prototype.readAsBinaryString) {
        readFun = FileReader.prototype.readAsBinaryString;
        fr.onload = function () {
            callback(this.result);
        };
    } else if (FileReader.prototype.readAsArrayBuffer) { // 在 ie11 添加 readAsBinaryString 兼容
        readFun = function (fileData) {
            var binary = "";
            var pt = this;
            var reader = new FileReader();
            reader.onload = function (e) {
                var bytes = new Uint8Array(reader.result);
                var length = bytes.byteLength;
                for (var i = 0; i < length; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                callback(binary);
            };
            reader.readAsArrayBuffer(fileData);
        };
    } else {
        console.error('FileReader not support readAsBinaryString');
    }
    readFun.call(fr, blob);
};

// 获取文件 sha1 值
var getFileSHA = function (blob, callback) {
    readAsBinaryString(blob, function (content) {
        var hash = CryptoJS.SHA1(content).toString();
        callback(null, hash);
    });
};

// 获取文件 md5 值
var getFileMd5 = function (blob, callback) {
    readAsBinaryString(blob, function (content) {
        var hash = md5(content);
        callback(null, hash);
    });
};
function clone(obj) {
    return map(obj, function (v) {
        return typeof v === 'object' ? clone(v) : v;
    });
}
function extend(target, source) {
    each(source, function (val, key) {
        target[key] = source[key];
    });
    return target;
}
function isArray(arr) {
    return arr instanceof Array;
}
function each(obj, fn) {
    for (var i in obj) {
        if (obj.hasOwnProperty(i)) {
            fn(obj[i], i);
        }
    }
}
function map(obj, fn) {
    var o = isArray(obj) ? [] : {};
    for (var i in obj) {
        if (obj.hasOwnProperty(i)) {
            o[i] = fn(obj[i], i);
        }
    }
    return o;
}
function filter(obj, fn) {
    var iaArr = isArray(obj);
    var o = iaArr ? [] : {};
    for (var i in obj) {
        if (obj.hasOwnProperty(i)) {
            if (fn(obj[i], i)) {
                if (iaArr) {
                    o.push(obj[i]);
                } else {
                    o[i] = obj[i];
                }
            }
        }
    }
    return o;
}
var binaryBase64 = function (str) {
    var i, len, char, arr = [];
    for (i = 0, len = str.length / 2; i < len; i++) {
        char = parseInt(str[i * 2] + str[i * 2 + 1], 16);
        arr.push(char);
    }
    return new Buffer(arr).toString('base64');
};
var uuid = function () {
    var S4 = function () {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };
    return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
};

var checkParams = function (apiName, params) {
    var bucket = params.Bucket;
    var region = params.Region;
    var object = params.Key;
    if (apiName.indexOf('Bucket') > -1 || apiName === 'deleteMultipleObject' || apiName === 'multipartList') {
        return bucket && region;
    }
    if (apiName.indexOf('Object') > -1 || apiName.indexOf('multipart') > -1 || apiName === 'sliceUploadFile' || apiName === 'abortUploadTask') {
        return bucket && region && object;
    }
    return true;
};

var apiWrapper = function (apiName, apiFn) {
    var regionMap = {
        'gz': 'ap-guangzhou',
        'tj': 'ap-beijing-2',
        'sh': 'ap-shanghai',
        'cd': 'ap-chengdu'
    };
    return function (params, callback) {
        callback = callback || function () {
            };
        if (apiName !== 'getService' && apiName !== 'abortUploadTask') {
            // 判断参数是否完整
            if (!checkParams(apiName, params)) {
                callback({error: 'lack of required params'});
                return;
            }
            // 判断 region 格式
            if (params.Region && regionMap[params.Region]) {
                callback({error: 'Region should be ' + regionMap[params.Region]});
                return;
            }
            // 判断 region 格式
            if (params.Region && params.Region.indexOf('cos.') > -1) {
                callback({error: 'Region should not be start with "cos."'});
                return;
            }
            // 兼容不带 AppId 的 Bucket
            if (params.Bucket) {
                if (!/^(.+)-(\d+)$/.test(params.Bucket)) {
                    if (params.AppId) {
                        params.Bucket = params.Bucket + '-' + params.AppId;
                    } else if (this.options.AppId) {
                        params.Bucket = params.Bucket + '-' + this.options.AppId;
                    } else {
                        callback({error: 'Bucket should format as "test-1250000000".'});
                        return;
                    }
                }
                if (params.AppId) {
                    console.warn('warning: AppId has been deprecated, Please put it at the end of parameter Bucket(E.g Bucket:"test-1250000000" ).');
                    delete params.AppId;
                }
            }
            // 兼容带有斜杠开头的 Key
            if (params.Key && params.Key.substr(0, 1) === '/') {
                params.Key = params.Key.substr(1);
            }
        }
        var res = apiFn.call(this, params, callback);
        if (apiName === 'getAuth' || apiName === 'getObjectUrl') {
            return res;
        }
    }
};

var throttleOnProgress = function (total, onProgress) {
    var self = this;
    var size0 = 0;
    var size1 = 0;
    var time0 = Date.now();
    var time1;
    var timer;
    function update() {
        timer = 0;
        if (onProgress && (typeof onProgress === 'function')) {
            time1 = Date.now();
            var speed = Math.max(0, Math.round((size1 - size0) / ((time1 - time0) / 1000) * 100) / 100);
            var percent;
            if (size1 === 0 && total === 0) {
                percent = 1;
            } else {
                percent = Math.round(size1 / total * 100) / 100 || 0;
            }
            time0 = time1;
            size0 = size1;
            try {
                onProgress({loaded: size1, total: total, speed: speed, percent: percent});
            } catch (e) {
            }
        }
    }
    return function (info, immediately) {
        if (info) {
            size1 = info.loaded;
            total = info.total;
        }
        if (immediately) {
            clearTimeout(timer);
            update();
        } else {
            if (timer) return;
            timer = setTimeout(update, self.options.ProgressInterval);
        }
    };
};

var fileSlice = function (file, start, end) {
    if (file.slice) {
        return file.slice(start, end);
    } else if (file.mozSlice) {
        return file.mozSlice(start, end);
    } else if (file.webkitSlice) {
        return file.webkitSlice(start, end);
    }
};

var util = {
    apiWrapper: apiWrapper,
    getAuth: getAuth,
    xml2json: xml2json,
    json2xml: json2xml,
    md5: md5,
    clearKey: clearKey,
    binaryBase64: binaryBase64,
    extend: extend,
    isArray: isArray,
    each: each,
    map: map,
    clone: clone,
    uuid: uuid,
    throttleOnProgress: throttleOnProgress,
};


module.exports = util;