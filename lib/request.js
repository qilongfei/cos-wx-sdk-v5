var obj2str = function (obj) {
    var i, key, val;
    var list = [];
    var keyList = Object.keys(obj);
    for (i = 0; i < keyList.length; i++) {
        key = keyList[i];
        val = obj[key] || '';
        list.push(key + '=' + encodeURIComponent(val));
    }
    return list.join('&');
};

var request = function (params, callback) {
    var filePath = params.filePath;
    var headers = params.headers;
    var url = params.url;
    var method = params.method;
    var onProgress = params.onProgress;
    var requestTask;

    var cb = function (err, response) {
        callback(err, {statusCode: response.statusCode, headers: response.header}, response.data);
    };

    if (filePath) {
        var m = url.match(/^(https?:\/\/[^/]+\/)(.*)$/);
        var key = m[2] || '';
        url = m[1];

        requestTask = wx.uploadFile({
            url: url,
            method: method,
            name: 'file',
            filePath: filePath,
            formData: {
                'key': key,
                'success_action_status': 200,
                'Signature': headers.Authorization
            },
            success: function (response) {
                cb(null, response);
            },
            fail: function (response) {
                cb(response.errMsg, response);
            }
        });
        requestTask.onProgressUpdate(function (res) {
            onProgress({
                loaded: res.totalBytesSent,
                total: res.totalBytesExpectedToSend,
                progress: res.progress / 100
            });
        });
    } else {
        var qsStr = params.qs && obj2str(params.qs) || '';
        if (qsStr) {
            url += (url.indexOf('?') > -1 ? '&' : '?') + qsStr;
        }
        wx.request({
            url: url,
            method: method,
            header: headers,
            dataType: 'text',
            data: params.body,
            success: function (response) {
                cb(null, response);
            },
            fail: function (response) {
                cb(response.errMsg, response);
            }
        });
    }

    return requestTask;
};

module.exports = request;