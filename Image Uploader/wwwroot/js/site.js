var imageUploaderViewModel = (function() {
    const inputElement = document.getElementById("upload-photo");
    inputElement.addEventListener("change", handleFiles, false);
    var excludeFileList = [];
    var fileList = [];
    var imageCount = 0;
    function handleFiles() {
        console.log(imageCount);
        if (imageCount <= 12) {
            if (imageCount + this.files.length <= 12) {
                fileList = this.files; /* now you can work with the file list */
                excludeFileList = [];
                $(".m-image-upload-btn span").html("<span style='font-size: 16px'><b>" + this.files.length + "</b>" + " files chosen</span>");
                $(".m-image-upload-btn img").css("display", "none");
                console.log(this.files);
                for (var i = 0; i < this.files.length; i++) {
                    if (this.files[i].size > 12582912) {
                        excludeFileList.push(this.files[i].name);
                        showAlert("One or more files are larger than 12 MB, they are excluded and will not be uploaded!", 7000)
                    }
                }
                if (this.files.length - excludeFileList.length > 0) {
                    $("#upload").removeClass("disabled");
                } else {
                    $(".m-image-upload-btn span").html("Add images");
                    $(".m-image-upload-btn img").css("display", "block");
                }
            } else {
                for (var p = imageCount + this.files.length - 12; p < this.files.length; p++) {
                    fileList = this.files; 
                    excludeFileList.push(this.files[p].name);
                    showAlert("Maximum number of files to be uploaded is 12! One or more files will not be uploaded!", 7000);
                    $(".m-image-upload-btn span").html("<span style='font-size: 16px'><b>" + this.files.length + "</b>" + " files chosen</span>");
                    $(".m-image-upload-btn img").css("display", "none");
                    $("#upload").removeClass("disabled");
                    console.log(excludeFileList);
                }
            }
        } else {
            $("#upload").addClass("disabled");
            showAlert("Maximum number of files to be uploaded is 12 !", 7000)

        }
    }

    function showAlert(message, timeout) {
        $(".m-alert").text(message);
        $(".m-alert").css("opacity", 1);
        setTimeout(function () {
            $(".m-alert").css("opacity", 0);
        }, timeout)
    }
    $("#upload").on("click", function () {
        if (!$("#upload").hasClass("disabled")) {
            var formData = new FormData();

            for (var i = 0; i < fileList.length; i++) {
                var ToExclude = false;
                for (var p in excludeFileList) {
                    if (excludeFileList[p].name == fileList[i].name) {
                        ToExclude = true;
                        break;
                    }
                }
                if (ToExclude) {
                    break;
                }
                formData.append("files", fileList[i]);
            }
            $.ajax(
                {
                    url: "/home/upload",
                    data: formData,
                    processData: false,
                    contentType: false,
                    type: "POST",
                    success: function (data) {
                        if (data.status == "ERR") {
                            showAlert("Unsupported format or image is larger than 9000px x 9000px!", 5000);
                        } else if (data.status == "MAX") {
                            showAlert("The maximum limit is exceeded!", 5000);

                        }
                        loadImages();
                       
                    }
                }
            );
        }

    })
    function loadImages() {
        $.ajax({
            type: "GET",
            dataType: "json",
            contentType: "application/json",
            url: "/home/loadImages",
            success: function (data) {
                if (data.status == "OK") {
                    $(".m-image-cards").children(".m-image-card").remove();
                    document.getElementById("upload-photo").value = "";
                    $(".m-image-upload-btn span").html("Add images");
                    $(".m-image-upload-btn img").css("display", "block");
                    $("#upload").addClass("disabled");
                    dragViewModel.loadImages(data.items);
                    imageCount = data.items.length;
                    dragViewModel.addCallback(dragEnd);
                }
            }
        });
    }
    function dragEnd() {
        console.log("drag end");
    }
    function deleteImage(id) {
        console.log(id);
        $.ajax({
            async: false,
            type: "POST",
            global: false,
            dataType: 'json',
            url: "/home/deleteImage",
            data: { 'imageId': id },
            success: function (data) {
                imageCount = 0;
            }
        });
    }
    function deleteAll() {
        $.ajax({
            async: false,
            type: "POST",
            global: false,
            dataType: 'json',
            url: "/home/deleteAll",
            success: function (data) {
                loadImages();
            }
        });
    }
    function imageOrderChange(ids) {
        $.ajax({
            async: false,
            type: "POST",
            global: false,
            dataType: 'json',
            url: "/home/imageOrderChange",
            data: { 'imageIds': ids },
            success: function (data) {
                console.log(data);
            }
        });
    }
    loadImages();
    return {
        loadImages: loadImages,
        deleteImage: deleteImage,
        imageOrderChange: imageOrderChange,
        deleteAll: deleteAll
    }
})();