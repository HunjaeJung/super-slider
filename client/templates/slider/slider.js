var defaultImageServer = 'http://image.jeegle.io/'
var uploadedImageServer = serverUrl + ":9999/uploads/";
var flickerImageServer = serverUrl + ":9999/flickr_style/images/";

function Slider() {
    this.$DisplayPieces = 9;      // [홀수] 하나의 화면에 얼마나 보여줄지 결정하게 됩니다.
    this.$MaximumImageNum = 21;   // [홀수] 로드하는 최대 이미지 개수입니다.
    this.$MainImageIndex = parseInt(this.$MaximumImageNum / 2); // 현재 중앙 이미지 번호입니다.
    this.$MainImageNode = null; // 중앙 이미지 노드입니다.
    this.$MainImageHeight = 0;        // 가운데 올 가장 큰 이미지의 한변의 길이입니다.
    this.$MainImageMaxHeight = 440;
    this.$SubImagesHeight = 0;   // 이미지 하나당 너비입니다.
    this.$HeaderHeight = 0;
    this.$FooterHeight = 0;
    this.$MarginPortion = 0.05; // 5% margin for both top and bottom
    this.$VerticalMargin = 0;
    this.$ArrowHeight = 36;
    this.$CurrentKeyword = [];    // 현재 이미지들을 만들어낸 키워드(문장+태그)들입니다.
}

// 이미지 슬라이더 객체입니다.
slider = new Slider();

// 이미지를 저장하고 있는 우선순위 큐입니다.
ImageQueue = new priorityQueue(slider.$MaximumImageNum);

// Template 생성시 최초 한번만 불리는 함수입니다.
Template.Slider.created = function () {
    Meteor.subscribe('UploadedImage');

    // 최초 100개의 이미지들을 shuffle 합니다.
    defaultImages = shuffle(defaultImages);

    // 100개를 세션에 저장해둡니다.
    Session.set("defaultImages", defaultImages);

    Tracker.autorun(function(){
        $('#loading-spinner').hide();

        console.log('total number of uploaded files: ' + UploadedImage.find().count());
        console.log(UploadedImage.find({"fileName": currentFilename}).fetch());
        learnResult = UploadedImage.find({"fileName": currentFilename}).fetch();

        if(learnResult.length == 0) return;
        $('#medal-id').show();

        var content = learnResult[0].content;
        var first = content.predict_style[0].name;
        first += " ";
        first += content.predict_obj[0].name;
        $('#first-prize').html(first);
        $('#medal-id').css('display','inline-block');

        var htmlList = [];
        var html = '<div class="predict-title">STYLES</div>'
        html += '<ul class="predict-ul">';
        htmlList.push(html);
        for(i=0;i<content.predict_obj.length;i++){
            html = '<li id="predict-style-'+i+'" class="predict-style" data-style-id="'+i+'">';
            html += content.predict_style[i].name
            html += '('+parseFloat(content.predict_style[i].score).toFixed(2)+')'
            html += '</li>';
            htmlList.push(html);
        }
        html = '</ul>';
        htmlList.push(html);

        html = '<div class="predict-title">OBJECTS</div>'
        html += '<ul class="predict-ul">';
        htmlList.push(html);
        for(i=0;i<content.predict_obj.length;i++){
            html = '<li id="predict-obj-'+i+'" class="predict-obj" data-obj-id="'+i+'">';
            html += content.predict_obj[i].name
            html += '('+parseFloat(content.predict_obj[i].score).toFixed(2)+')'
            html += '</li>';
            htmlList.push(html);
        }
        html = '</ul>';
        htmlList.push(html);

        try{
            $('#medal-id').tooltipster('destroy');
        }
        catch(err){

        }
        $('#medal-id').tooltipster({
            content: $(htmlList.join('')),
            theme: 'tooltipster-punk-2',
            position: 'bottom',
            trigger: 'click'
        });
        changeSubImages(content.recommended);
    });

}

// Template이 모두 render 되었을 때 불리는 함수 입니다.
Template.Slider.rendered = function () {
    if (!this.rendered) {
        this.rendered = true;

        // 미리 가지고 있는 이미지들을 가져옵니다.
        getDefaultImages();

        // 양쪽 화살표를 누르면 사진이 넘어갑니다.
        document.onkeydown = function (e) {
            if (e.keyCode == 39) {
                //오른쪽 방향기 = move left 버튼 클릭
                $('#slider-btn-left').trigger('click',1);
            } else if (e.keyCode == 37) {
                //왼쪽 방향키 = move right 버튼 클릭
                $('#slider-btn-right').trigger('click',1);
            }
        };

        $('body').on('click', '.image-div', function() {
            // 눌러서 현재 id랑 차이 만큼의 속도로 애니메이션 이동
            var clickedNum = parseInt(this.getAttribute('data-num'));
            var centerNum = parseInt($('#main-image-li').attr('data-num'));
            var maxRange = parseInt(slider.$DisplayPieces/2);

            // (slider.$MaximumImageNum-1) index 와 0 index 사이 처리
            if(centerNum < maxRange && clickedNum > (slider.$MaximumImageNum-maxRange-1)){
                clickedNum = clickedNum - slider.$MaximumImageNum;
            }else if(centerNum > (slider.$MaximumImageNum-maxRange-1) && clickedNum < maxRange){
                clickedNum = clickedNum + slider.$MaximumImageNum;
            }

            var diff = clickedNum - centerNum;
            if(diff == 0){
                return;
            }

            if(diff<0){
                $('#slider-btn-right').trigger('click',Math.abs(diff));
            }else{
                $('#slider-btn-left').trigger('click',Math.abs(diff));
            }
        });

        // responsive 코드입니다.
        $(window).resize(function () {
            setSuperSlider();
            setImagePosition();
        });
    }
};

Template.Slider.events({
});

currentFilename = "";
Template.Slider.helpers({
    images: function () {
        var tempObject = Session.get("images");
        if (!!tempObject) {
            var clone = new Array();
            for ( var i = 0; i < slider.$MaximumImageNum; i++ ){
                clone[i] = tempObject[i];
            }

            var cen = slider.$MainImageIndex;
            tempObject[cen] = clone[0];
            for ( var i = 1; i < slider.$MaximumImageNum/2; i++){
                var left = cen - i;
                var right = cen + i;
                if(left < 0) left = slider.$MaximumImageNum + left;
                if(right >= slider.$MaximumImageNum) right = right - slider.$MaximumImageNum ;

                tempObject[left] = clone[i*2-1];
                tempObject[right] = clone[i*2];
            }

            try{
                $('[data-num]').tooltipster('destroy');
                $('[data-num]').tooltipster('destroy');
                $('[data-num]').tooltipster('destroy');
            }
            catch(err){
            }
            for (var i = 0; i < tempObject.length; i++) {
                tempObject[i].index = i;

                var html = "";
                html += '<h2>' + tempObject[i].data.style + '</h2>';
                $('[data-num="'+i+'"]').tooltipster({
                    content: $(html),
                    multiple: true,
                    theme: 'tooltipster-punk'
                });

                html = "";
                html += '<h2>' + tempObject[i].data.object + '</h2>';
                $('[data-num="'+i+'"]').tooltipster({
                    content: $(html),
                    multiple: true,
                    theme: 'tooltipster-punk',
                    position: 'bottom'
                });


                html = "";
                html += '<h2> score: ' + parseFloat(tempObject[i].data.score).toFixed(4) + '</h2>';
                $('[data-num="'+i+'"]').tooltipster({
                    content: $(html),
                    multiple: true,
                    theme: 'tooltipster-punk',
                    position: 'right'
                });
            }
        }
        return tempObject;
    },
    imageUploaded: function() {
        return {
            finished: function(index, fileInfo, context) {
                currentFilename = fileInfo.name;
                changeMainImage(fileInfo.name);
                $('#predict-objs').html('');
                $('#predict-styles').html('');
                $('#loading-spinner').show();
                $('#medal-id').hide();
            }
        }
    }
});

function getDefaultImages() {
    // 100개의 이미지를 받아옵니다.
    var Images = Session.get("defaultImages");

    // set image server
    for(i=0; i<Images.length; i++){
        //Images[i].score = i;
        Images[i].imageServer = "http://image.jeegle.io/";
        Images[i].recFlag = false;
        Images[i].style = "default style";
        Images[i].object = "default object";
        Images[i].obj_score = 0;
    }

    // 이미지를 우선순위 큐에 넣습니다.
    pushImages(Images);

    // 나중에 이미지들이 바뀔때, 중앙 이미지는 바뀌면 안되므로, 중앙 이미지를 기억하고 있습니다.
    slider.$MainImageNode = ImageQueue.heap[0];

    // 세션에 새롭게 생성된 slider.$MaximumImageNum 크기의 이미지 큐를 넣어줍니다.
    Session.set("images", ImageQueue.heap);

    // 일단 Session을 set하면 Template.Slider.helper 메소드에서 Session.get을 해야하기 때문에 시간을 필요로 한다.
    //Tracker.flush(); // 왜 그런걸까? Computation, Tracker, flush ...
    Tracker.afterFlush(function () {
        setSuperSlider();
        setImagePosition();
    })
}

function changeMainImage(filename){
    var imageSrc = uploadedImageServer + filename;
    $('#main-image').attr('src',imageSrc);
    refreshBackgroundImg(imageSrc);

    ImageQueue.heap[slider.$MainImageIndex].data._id = "";
    ImageQueue.heap[slider.$MainImageIndex].data.imageServer = uploadedImageServer;
    ImageQueue.heap[slider.$MainImageIndex].data.originalImageUrl = "";
    ImageQueue.heap[slider.$MainImageIndex].data.thumbnailImageUrl = "";
    ImageQueue.heap[slider.$MainImageIndex].data.recFlag = false;
    ImageQueue.heap[slider.$MainImageIndex].data.title = filename;
    ImageQueue.heap[slider.$MainImageIndex].data.score = 10;

    slider.$MainImageNode = ImageQueue.heap[slider.$MainImageIndex];
}

function changeSubImages(recommended){
    var i=0;
    var Images = new Array();

    /*
    {
        "title": "creepy-curve-dark-1096-640.jpg",
        "imageServer": "http://image.jeegle.io/"
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/creepy-curve-dark-1096-824x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/creepy-curve-dark-1096.jpg",
        "_id": "a7e3b710-f233-11e4-ae61-f7d49e4b7682"
    }
    */

    for(i=0;i<recommended.length;i++){
        var img = {};
        img.title = recommended[i].filename;
        img.imageServer = flickerImageServer;
        img.thumbnailImageUrl = null;
        img.originalImageUrl = null;
        img._id = null;
        img.recFlag = true;

        img.score = recommended[i].style_obj_score
        img.style = recommended[i].style
        img.object = recommended[i].object
        img.obj_score = recommended[i].obj_score
        Images.push(img);
    }

    pushImages(Images);

    restoreCenterImage();

    // 세션에 새롭게 생성된 slider.$MaximumImageNum 크기의 이미지 큐를 넣어줍니다.
    Session.set("images", ImageQueue.heap);
    Tracker.afterFlush(function () {
        setImagePosition();
    })
}

/*
   설명: 이미지 슬라이더의 기본 위치와 크기를 설정하는 함수입니다.
   */
function setSuperSlider() {
    // 브라우져의 너비와 높이를 받아옵니다.
    var windowWidth = $(window).width();
    var windowHeight = $(window).height();

    // 메인 이미지 너비=높이 설정
    //var mainImageHeight = windowHeight - (slider.$FooterHeight + slider.$HeaderHeight + slider.$VerticalMargin);
    var headerPortion = slider.$HeaderHeight/windowHeight;
    var footerPortion = slider.$FooterHeight/windowHeight;
    var marginPortion = slider.$MarginPortion;
    var mainImageHeight = (1 - (headerPortion + footerPortion + marginPortion)) * windowHeight;

    if(mainImageHeight > slider.$MainImageMaxHeight)
        mainImageHeight = slider.$MainImageMaxHeight;

    // 작은 이미지들 너비=높이 설정
    var subImagesHeight = (windowWidth - mainImageHeight) / (slider.$DisplayPieces - 1); // 작은 이미지의 각자 길이 width=height

    // slider 총 너비
    var sliderWidth = subImagesHeight * (slider.$MaximumImageNum - 1) + mainImageHeight;
    var leftPosition = -(sliderWidth - windowWidth) / 2;

    // Height 너무 작으면 극혐을 제거한다.
    if(mainImageHeight <= subImagesHeight){
        $('#container-wrapper').css('visibility', 'hidden');
    }else{
        $('#container-wrapper').css('visibility', '');
    }

    $('#drag-info').css('width', mainImageHeight);
    $('#drag-info').css('left', subImagesHeight * parseInt(slider.$DisplayPieces / 2));
    $('#drag-info').css('top', (windowHeight-(mainImageHeight+slider.$HeaderHeight+slider.$FooterHeight))/2-50);

    // dropzone 반응형
    $('.jqDropZone').css('width', mainImageHeight);
    $('.jqDropZone').css('height', mainImageHeight);
    $('.jqDropZone').css('left', subImagesHeight * parseInt(slider.$DisplayPieces / 2));

    // slider box 조절
    $('#slider-box').css('top', (windowHeight-(mainImageHeight+slider.$HeaderHeight+slider.$FooterHeight))/2);
    $('#slider-box').css('height', mainImageHeight);

    // slider 조절
    $('#slider').css('width', sliderWidth+subImagesHeight); // (+subImagesHeight) is margin for image load duration
    $('#slider').css('height', subImagesHeight); // slider ul 또한 동일한 height를 주게 됩니다.
    $('#slider').css('top', (mainImageHeight - subImagesHeight) / 2);
    $('#slider').css('left', leftPosition); // 가운데 정렬

    // 각 이미지를 감싸고 있는 li
    $('.image-div').css('width', subImagesHeight);
    $('.image-div').css('height', subImagesHeight);

    // 중앙 엘리먼트 크기 설정
    var centralElement = $('#slider').find('li:nth-child(' + parseInt(parseInt(slider.$MaximumImageNum / 2) + 1) + ')');
    centralElement.css('width', mainImageHeight);
    centralElement.css('height', mainImageHeight);
    centralElement.css('bottom', (mainImageHeight - subImagesHeight) / 2);
    centralElement[0].children[0].id = 'main-image';
    centralElement[0].id = 'main-image-li';

    // slider 변수 재설정
    slider.$MainImageHeight = mainImageHeight;
    slider.$SubImagesHeight = subImagesHeight;

    // 배경이미지 설정
    refreshBackgroundImg(centralElement[0].children[0].src);

    // 버튼 위치 설정
    //$('a.control-prev').css('top', (slider.$MainImageHeight - slider.$ArrowHeight) / 2 + "px");
    //$('a.control-next').css('top', (slider.$MainImageHeight - slider.$ArrowHeight) / 2 + "px");

    var Duration = 150;
    function moveLeft(cen,diff) {
        if(diff==0) return;

        var bigToSmall = cen + 1;
        var smallToBig = cen;

        // ani #1: slider 전체 이동
        $('#slider').animate({
            left: leftPosition + subImagesHeight
        }, Duration, function () {
            $('#slider').find('li:last-child').prependTo('#slider');
            $('#slider').css('left', leftPosition);
        });

        // ani #2: 이미지 감싸고 있는 박스 이동 (큰거에서 작아지는)
        var bigToSmallLi = $('#slider').find('li:nth-child(' + (bigToSmall) + ')')
        bigToSmallLi.animate({
            width: subImagesHeight,
            height: subImagesHeight,
            bottom: 0
        }, Duration, function () {
            moveLeft(cen,diff-1);
        })

        var bigToSmallImg = $('#slider').find('li:nth-child(' + (bigToSmall) + ') img');
        bigToSmallImg.attr('id', '');
        bigToSmallImg.parent().attr('id', '');

        // ani #3: 이미지 이동 position left값 (큰거에서 작아지는)
        if (bigToSmallImg[0].naturalWidth > bigToSmallImg[0].naturalHeight) {
            var smallWidth = parseInt(bigToSmallImg[0].style.left.split('p')[0]) * (subImagesHeight / slider.$MainImageHeight)
            $('#slider').find('li:nth-child(' + (bigToSmall) + ') img').animate({
                left: smallWidth + "px"
            }, Duration, function () {
            })
        } else {
            var smallHeight = parseInt(bigToSmallImg[0].style.top.split('p')[0]) * (subImagesHeight / slider.$MainImageHeight)
            $('#slider').find('li:nth-child(' + (bigToSmall) + ') img').animate({
                top: smallHeight + "px"
            }, Duration, function () {
            })
        }

        // ani #4: 이미지 감싸고 있는 박스 이동 (작은거에서 커지는)
        var smallToBigLi = $('#slider').find('li:nth-child(' + (smallToBig) + ')')
        smallToBigLi.animate({
            width: slider.$MainImageHeight,
            height: slider.$MainImageHeight,
            bottom: (slider.$MainImageHeight - subImagesHeight) / 2
        }, Duration, function () {
        });

        var smallToBigImg = $('#slider').find('li:nth-child(' + (smallToBig) + ') img');
        smallToBigImg.attr('id', 'main-image');
        smallToBigImg.parent().attr('id', 'main-image-li');

        // ani #5: 이미지 이동 position left값 (작은거에서 커지는)
        if (smallToBigImg[0].naturalWidth > smallToBigImg[0].naturalHeight) {
            // var bigWidth = smallToBigImg[0].offsetWidth * (slider.$MainImageHeight / subImagesHeight)
            var bigWidth = parseInt(smallToBigImg[0].style.left.split('p')[0]) * (slider.$MainImageHeight / subImagesHeight)
            $('#slider').find('li:nth-child(' + (smallToBig) + ') img').animate({
                left: bigWidth + "px"
            }, Duration, function (e) {
            })
        } else {
            // var bigHeight = smallToBigImg[0].offsetHeight  * (slider.$MainImageHeight / subImagesHeight)
            var bigHeight = parseInt(smallToBigImg[0].style.top.split('p')[0]) * (slider.$MainImageHeight / subImagesHeight)
            $('#slider').find('li:nth-child(' + (smallToBig) + ') img').animate({
                top: bigHeight + "px"
            }, Duration, function (e) {
            })
        }

        // 가운데 이미지 번호를 가지고 있습니다.
        slider.$MainImageIndex = parseInt(smallToBigLi.attr('data-num')); //this image number
        slider.$MainImageNode = ImageQueue.heap[0];

        // 배경이미지 설정
        refreshBackgroundImg(smallToBigImg[0].src);
    };

    function moveRight(cen, diff) {
        if(diff==0) return;

        var bigToSmall = cen + 1;
        var smallToBig = cen + 2;

        $('#slider').animate({
            left: leftPosition - subImagesHeight
        }, Duration, function () {
            $('#slider').find('li:first-child').appendTo('#slider');
            $('#slider').css('left', leftPosition);
        });

        var bigToSmallLi = $('#slider').find('li:nth-child(' + (bigToSmall) + ')');
        bigToSmallLi.animate({
            width: subImagesHeight,
            height: subImagesHeight,
            bottom: 0
        }, Duration, function () {
            moveRight(cen,diff-1);
        })

        var bigToSmallImg = $('#slider').find('li:nth-child(' + (bigToSmall) + ') img');
        bigToSmallImg.attr('id', '');
        bigToSmallImg.parent().attr('id', '');

        if (bigToSmallImg[0].naturalWidth > bigToSmallImg[0].naturalHeight) {
            var smallWidth = parseInt(bigToSmallImg[0].style.left.split('p')[0]) * (subImagesHeight / slider.$MainImageHeight)
            $('#slider').find('li:nth-child(' + (bigToSmall) + ') img').animate({
                left: smallWidth + "px"
            }, Duration, function () {
            })
        } else {
            var smallHeight = parseInt(bigToSmallImg[0].style.top.split('p')[0]) * (subImagesHeight / slider.$MainImageHeight)
            $('#slider').find('li:nth-child(' + (bigToSmall) + ') img').animate({
                top: smallHeight + "px"
            }, Duration, function () {
            })
        }

        var smallToBigLi = $('#slider').find('li:nth-child(' + (smallToBig) + ')');
        smallToBigLi.animate({
            width: slider.$MainImageHeight, //'580px',
            height: slider.$MainImageHeight, //'580px',
            bottom: (slider.$MainImageHeight - subImagesHeight) / 2
        }, Duration, function () {
        })
        // 가운데 이미지 번호를 가지고 있습니다.
        slider.$MainImageIndex = parseInt(smallToBigLi.attr('data-num')); //this image number
        slider.$MainImageNode = ImageQueue.heap[0];

        var smallToBigImg = $('#slider').find('li:nth-child(' + (smallToBig) + ') img');
        smallToBigImg.attr('id', 'main-image');
        smallToBigImg.parent().attr('id', 'main-image-li');

        if (smallToBigImg[0].naturalWidth > smallToBigImg[0].naturalHeight) {
            var bigWidth = parseInt(smallToBigImg[0].style.left.split('p')[0]) * (slider.$MainImageHeight / subImagesHeight)
            $('#slider').find('li:nth-child(' + (smallToBig) + ') img').animate({
                left: bigWidth + "px"
            }, Duration, function (e) {
                smallToBigImg[0].style.left = -(smallToBigImg[0].offsetWidth - slider.$MainImageHeight) / 2
            })
        } else {
            // var bigHeight = smallToBigImg[0].offsetHeight  * (slider.$MainImageHeight / subImagesHeight)
            var bigHeight = parseInt(smallToBigImg[0].style.top.split('p')[0]) * (slider.$MainImageHeight / subImagesHeight)
            $('#slider').find('li:nth-child(' + (smallToBig) + ') img').animate({
                top: bigHeight + "px"
            }, Duration, function (e) {
                smallToBigImg[0].style.top = -(smallToBigImg[0].offsetHeight - slider.$MainImageHeight) / 2
            })
        }

        // 배경이미지 설정
        refreshBackgroundImg(smallToBigImg[0].src);
    };

    var centerIndex = parseInt(slider.$MaximumImageNum / 2);
    $('a.control-prev').unbind('click');
    $('a.control-prev').click(_.debounce(function (e, diff) {
        e.preventDefault();
        moveLeft(centerIndex, diff);
    }, Duration*4));

    $('a.control-next').unbind('click');
    $('a.control-next').click(_.debounce(function (e, diff) {
        e.preventDefault();
        moveRight(centerIndex, diff);
    }, Duration*4));
};


function refreshBackgroundImg(src){
    // 배경이미지 설정
    var backgroundStyle = "url('" + src + "')";
    $('.body-background').css('background-image', backgroundStyle)
}

function sliderHeaderFooterReactive(mainImageHeight){
    $('.tag-nav-wrapper').css('width', mainImageHeight + 'px'); // 태그 바입니다.
    $('.bottom-content').css('width', mainImageHeight + 'px'); // 태그 바입니다.
}

function setImagePosition() {
    var slider_images = document.getElementsByName('images-in-belt');

    _.forEach(slider_images, function (img) {
        if (img.complete) {
            onLoadImage(img);
        } else {
            img.onload = onLoadImage;
        }
    })

    function onLoadImage(img) {
        if (this != window) {
            //onload 이벤트 실행시
            img = this;
        }

        var naturalWidth = img.naturalWidth;
        var naturalHeight = img.naturalHeight; //real image size

        if (naturalWidth > naturalHeight) {
            // 가로가 더 긴 경우
            img.style.height = "100%";
            img.style.width = 'auto';
            img.style.top = 0;
            if (img.id == 'main-image') {
                img.style.left = -(img.offsetWidth - slider.$MainImageHeight) / 2 + "px";
            } else {
                img.style.left = -(img.offsetWidth - slider.$SubImagesHeight) / 2 + "px";
            }
        } else {
            // 세로가 더 긴 경우
            img.style.width = '100%';
            img.style.height = 'auto';
            img.style.left = 0;
            if (img.id == 'main-image') {
                img.style.top = -(img.offsetHeight - slider.$MainImageHeight) / 2 + "px";
            } else {
                img.style.top = -(img.offsetHeight - slider.$SubImagesHeight) / 2 + "px";
            }
        }
    }
}


function pushImages(Images){
    if (ImageQueue.isFull()) {
        ImageQueue.decAllPriority();
    }
    for (k = 0; k < Images.length; k++) {
        var duplicatedFlag = false;
        for (j = 0; j < ImageQueue.heap.length; j++) {
            if (ImageQueue.heap[j].data.title == Images[k].title) {
                duplicatedFlag = true;
                break;
            }
        }
        if (duplicatedFlag) continue;

        ImageQueue.push(Images[k], Images[k].score);
    }

    ImageQueue.heap = ImageQueue.heap.sort(function(a,b) {return b-a});
}


function restoreCenterImage() {
    if (slider.$MainImageNode != null) {
        ImageQueue.heap[0] = slider.$MainImageNode;
    }
}


var defaultImages = [
    {
        "title": "creepy-curve-dark-1096-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/creepy-curve-dark-1096-824x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/creepy-curve-dark-1096.jpg",
        "_id": "a7e3b710-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "agriculture-cereals-field-1098-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/agriculture-cereals-field-1098-733x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/agriculture-cereals-field-1098.jpg",
        "_id": "a8128f40-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "forest-hiking-nature-1102-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/forest-hiking-nature-1102-825x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/forest-hiking-nature-1102.jpg",
        "_id": "a831d710-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "bridge-lake-landing-stage-1104-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/bridge-lake-landing-stage-1104-550x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/bridge-lake-landing-stage-1104.jpg",
        "_id": "a84e11a0-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "beach-bus-holiday-1106-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/beach-bus-holiday-1106-830x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/beach-bus-holiday-1106.jpg",
        "_id": "a857d5a0-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "boy-landscape-man-1108-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/boy-landscape-man-1108-825x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/boy-landscape-man-1108.jpg",
        "_id": "a88c7a30-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "agriculture-cereals-field-1110-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/agriculture-cereals-field-1110-823x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/agriculture-cereals-field-1110.jpg",
        "_id": "a8a83f90-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "abstract-black-and-white-blur-1112-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/abstract-black-and-white-blur-1112-825x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/abstract-black-and-white-blur-1112.jpg",
        "_id": "a8c93510-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "animal-bokeh-insect-1114-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/animal-bokeh-insect-1114-825x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/animal-bokeh-insect-1114.jpg",
        "_id": "a8d717c0-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "cables-rails-1116-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/cables-rails-1116-821x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/cables-rails-1116.jpg",
        "_id": "a8ed5ee0-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "bubbles-lights-things-1117-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/bubbles-lights-things-1117-366x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/bubbles-lights-things-1117.jpg",
        "_id": "a8fca120-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "hiking-landscape-mountains-1119-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/hiking-landscape-mountains-1119-828x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/hiking-landscape-mountains-1119.jpg",
        "_id": "a9199f00-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "couple-dawn-dusk-1121-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/couple-dawn-dusk-1121-825x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/couple-dawn-dusk-1121.jpg",
        "_id": "a92a19c0-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "bonnet-fireflies-glowworms-1123-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/bonnet-fireflies-glowworms-1123-830x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/bonnet-fireflies-glowworms-1123.jpg",
        "_id": "a95373b0-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "building-cars-city-1126-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/building-cars-city-1126-550x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/building-cars-city-1126.jpg",
        "_id": "a9715bf0-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "landscape-nature-snow-1127-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/landscape-nature-snow-1127-825x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/landscape-nature-snow-1127.jpg",
        "_id": "a99b2b10-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "lake-landscape-mountains-1130-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/lake-landscape-mountains-1130-825x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/lake-landscape-mountains-1130.jpg",
        "_id": "a9b2f8d0-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "cloudy-hills-lake-1133-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/cloudy-hills-lake-1133-733x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/cloudy-hills-lake-1133.jpg",
        "_id": "a9c59670-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "black-and-white-lake-relaxing-1135-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/black-and-white-lake-relaxing-1135-846x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/black-and-white-lake-relaxing-1135.jpg",
        "_id": "a9de4e90-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "animal-dog-eyes-1137-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/animal-dog-eyes-1137-918x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/animal-dog-eyes-1137.jpg",
        "_id": "a9f531f0-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "black-and-white-buildings-city-1139-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/black-and-white-buildings-city-1139-977x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/black-and-white-buildings-city-1139.jpg",
        "_id": "aa169ca0-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "dandelion-flower-garden-1141-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/dandelion-flower-garden-1141-687x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/dandelion-flower-garden-1141.jpg",
        "_id": "aa3b1490-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "cold-landscape-road-1142-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/cold-landscape-road-1142-825x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/cold-landscape-road-1142.jpg",
        "_id": "aa557a60-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "colorful-colourful-girl-1145-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/colorful-colourful-girl-1145-823x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/colorful-colourful-girl-1145.jpg",
        "_id": "aa6a3ae0-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "apple-display-imac-1147-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/apple-display-imac-1147-825x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/apple-display-imac-1147.jpg",
        "_id": "aa8208a0-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "apple-imac-keyboard-1149-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/apple-imac-keyboard-1149-825x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/apple-imac-keyboard-1149.jpg",
        "_id": "aad18830-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "black-and-white-border-fence-1151-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/black-and-white-border-fence-1151-825x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/black-and-white-border-fence-1151.jpg",
        "_id": "aaee8610-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "city-industry-lights-1153-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/city-industry-lights-1153-812x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/city-industry-lights-1153.jpg",
        "_id": "ab11ec90-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "fog-forest-hiking-1155-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/fog-forest-hiking-1155-825x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/fog-forest-hiking-1155.jpg",
        "_id": "ab274950-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "cactus-home-plant-1157-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/cactus-home-plant-1157-821x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/cactus-home-plant-1157.jpg",
        "_id": "ab355310-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "bokeh-glass-rain-1159-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/bokeh-glass-rain-1159-825x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/bokeh-glass-rain-1159.jpg",
        "_id": "ab5de9b0-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "bus-public-transportation-seat-1161-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/bus-public-transportation-seat-1161-825x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/bus-public-transportation-seat-1161.jpg",
        "_id": "ab7430d0-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "forest-light-night-1163-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/forest-light-night-1163-825x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/forest-light-night-1163.jpg",
        "_id": "ab868050-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "hand-macbook-air-person-1165-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/hand-macbook-air-person-1165-825x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/hand-macbook-air-person-1165.jpg",
        "_id": "ab9cc770-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "macbook-air-notebook-technology-1168-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/macbook-air-notebook-technology-1168-825x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/macbook-air-notebook-technology-1168.jpg",
        "_id": "abce37b0-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "app-store-device-macbook-air-1171-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/app-store-device-macbook-air-1171-825x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/app-store-device-macbook-air-1171.jpg",
        "_id": "abe4ccf0-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "animal-dog-funny-1173-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/animal-dog-funny-1173-825x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/animal-dog-funny-1173.jpg",
        "_id": "ac275430-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "car-driving-road-1176-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/car-driving-road-1176-366x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/car-driving-road-1176.jpg",
        "_id": "ac42a460-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "animal-landing-stage-ocean-1177-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/animal-landing-stage-ocean-1177-828x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/animal-landing-stage-ocean-1177.jpg",
        "_id": "ac540980-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "animals-grass-lawn-1180-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/animals-grass-lawn-1180-825x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/animals-grass-lawn-1180.jpg",
        "_id": "ac6e2130-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "bike-bike-rider-dark-1181-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/bike-bike-rider-dark-1181-825x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/bike-bike-rider-dark-1181.jpg",
        "_id": "ac7ec300-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "bushes-desert-dry-1183-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/bushes-desert-dry-1183-828x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/bushes-desert-dry-1183.jpg",
        "_id": "acacb0d0-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "apple-desk-device-1185-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/apple-desk-device-1185-825x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/apple-desk-device-1185.jpg",
        "_id": "accfa220-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "bridge-brooklyn-bridge-buildings-1188-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/bridge-brooklyn-bridge-buildings-1188-825x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/bridge-brooklyn-bridge-buildings-1188.jpg",
        "_id": "acf8d500-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "camera-lens-old-1191-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/camera-lens-old-1191-830x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/camera-lens-old-1191.jpg",
        "_id": "ad258a50-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "dry-field-ocean-1193-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/dry-field-ocean-1193-825x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/dry-field-ocean-1193.jpg",
        "_id": "ad5a7d00-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "clouds-cloudy-dramatic-1195-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/clouds-cloudy-dramatic-1195-825x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/clouds-cloudy-dramatic-1195.jpg",
        "_id": "ad6ad0b0-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "earth-grass-ground-1197-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/earth-grass-ground-1197-412x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/earth-grass-ground-1197.jpg",
        "_id": "ad7e58b0-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "cheese-food-italian-1198-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/cheese-food-italian-1198-825x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/cheese-food-italian-1198.jpg",
        "_id": "ad989770-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "bench-man-manhattan-1200-640.jpeg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/bench-man-manhattan-1200-733x550.jpeg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/bench-man-manhattan-1200.jpeg",
        "_id": "adb82d60-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "bridges-canal-city-1202-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/bridges-canal-city-1202-825x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/bridges-canal-city-1202.jpg",
        "_id": "ade38320-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "blur-blurred-green-1204-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/blur-blurred-green-1204-825x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/blur-blurred-green-1204.jpg",
        "_id": "ae040370-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "blonde-girl-hairs-1206-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/blonde-girl-hairs-1206-825x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/blonde-girl-hairs-1206.jpg",
        "_id": "ae1b8310-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "animals-birds-flying-1209-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/animals-birds-flying-1209-825x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/animals-birds-flying-1209.jpg",
        "_id": "ae421de0-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "carnival-costume-culture-1212-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/carnival-costume-culture-1212-825x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/carnival-costume-culture-1212.jpg",
        "_id": "ae535bf0-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "landscape-mountains-nature-1214-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/landscape-mountains-nature-1214-1578x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/landscape-mountains-nature-1214.jpg",
        "_id": "aeaaf1d0-f233-11e4-ae61-f7d49e4b7682"
    },
    {
        "title": "avenue-black-and-white-street-1216-640.jpg",
        "score": 0,
        "thumbnailImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/avenue-black-and-white-street-1216-825x550.jpg",
        "originalImageUrl": "http://static.pexels.com/wp-content/uploads/2014/06/avenue-black-and-white-street-1216.jpg",
        "_id": "aebfd960-f233-11e4-ae61-f7d49e4b7682"
    }]
