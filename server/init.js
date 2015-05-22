//file:/server/init.js
Meteor.startup(function () {
    UploadServer.init({
        tmpDir: process.env.PWD + '/.uploads/tmp',
        //uploadDir: process.env.PWD + '/public/images/',
        //local에 저장
        uploadDir: '/Users/hunjae/uploads/',
        checkCreateDirectories: true, //create the directories for you
        //getDirectory: function(fileInfo, formData) {
        //    // create a sub-directory in the uploadDir based on the content type (e.g. 'images')
        //    return formData.contentType;
        //},
        finished: function(fileInfo, formFields) {
            // perform a disk operation
            console.log('Image upload is completed');

            if(fileInfo['error']!=null) return;

            Meteor.call('callPython', fileInfo);
            // 1. Caffe에 함수 파일path/파일명 parameter로 던짐 (async 함수로)
            // 2. Caffe에서 프로세싱.. 끝나면 callback 함수 호출
            // 3. meteor가 받아오는(caffe가 던져주는) 값은 (분위기 + 같은 분위기 이미지 list)
        },
        cacheTime: 100,
        mimeTypes: {
            "xml": "application/xml",
            "vcf": "text/x-vcard"
        }
    })
});

console.log(process.env.PWD);
var exec = Npm.require('child_process').exec;
var Fiber = Npm.require('fibers');
var Future = Npm.require('fibers/future');
Meteor.methods({
    callPython: function(fileInfo) {
        var fileInfoParam= JSON.stringify(fileInfo)
        var fut = new Future();
        exec('python /Users/hunjae/hello.py ' + fileInfoParam, function (error, stdout, stderr) {
            // if you want to write to Mongo in this callback
            // you need to get yourself a Fiber
            console.log('stdout: ' + stdout);

            new Fiber(function() {
                fut.return('Python was here');
            }).run();
        });
        return fut.wait();
    }
});