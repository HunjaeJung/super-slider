//file:/server/init.js
Meteor.startup(function () {
    UploadServer.init({
        tmpDir: process.env.PWD + '/.uploads/tmp',
        //uploadDir: process.env.PWD + '/.uploads/',
        uploadDir: '/shared/uploads',
        checkCreateDirectories: true,
        finished: function(fileInfo, formFields) {
            if(fileInfo['error']!=null) return;
            var requestUrl = serverUrl + ':8080?path=/shared/uploads/' + fileInfo.name;

            HTTP.call("GET", requestUrl, {}, function(err, result){
                if(err) throw err;

                console.log(result)
                if(!result){
                    console.log('no result');
                    return;
                }

                result.content = JSON.parse(result.content)
                result.fileName = fileInfo.name;
                UploadedImage.insert(result);
                return result;
            });
            //Meteor.call('callPython', fileInfo);
        },
        cacheTime: 100,
        mimeTypes: {
            "xml": "application/xml",
            "vcf": "text/x-vcard"
        }
    })
});

/*
var exec = Npm.require('child_process').exec;
var Fiber = Npm.require('fibers');
var Future = Npm.require('fibers/future');
Meteor.methods({
    callPython: function(fileInfo) {
        var fileInfoParam= JSON.stringify(fileInfo)
        var fut = new Future();
        exec('python /home/dove/hello.py ' + fileInfoParam, function (error, stdout, stderr) {
            console.log('stdout: ' + stdout);

            new Fiber(function() {
                fut.return('Python was here');
            }).run();
        });
        return fut.wait();
    }
});
*/
