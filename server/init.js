//file:/server/init.js
Meteor.startup(function () {
    UploadServer.init({
        tmpDir: process.env.PWD + '/.uploads/tmp',
        uploadDir: process.env.PWD + '/.uploads/',
        checkCreateDirectories: true,
        finished: function(fileInfo, formFields) {
            if(fileInfo['error']!=null) return;
            Meteor.call('callPython', fileInfo);
        },
        cacheTime: 100,
        mimeTypes: {
            "xml": "application/xml",
            "vcf": "text/x-vcard"
        }
    })
});

var exec = Npm.require('child_process').exec;
var Fiber = Npm.require('fibers');
var Future = Npm.require('fibers/future');
Meteor.methods({
    callPython: function(fileInfo) {
        var fileInfoParam= JSON.stringify(fileInfo)
        var fut = new Future();
        exec('python /User/hunjae/hello.py ' + fileInfoParam, function (error, stdout, stderr) {
            console.log('stdout: ' + stdout);

            new Fiber(function() {
                fut.return('Python was here');
            }).run();
        });
        return fut.wait();
    }
});