var imageUploaderViewModel = (function () {
    const inputElement = document.getElementById("upload-photo");
    inputElement.addEventListener("change", handleFiles, false);
    function toBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        })
    };
    var excludeFileList = [];
    var fileList = [];
    var fileObjects = [];
    var pendingUpload = false;
    var imageCount = 0;
    async function handleFiles() {
        console.log(imageCount);
        if (imageCount <= 12) {
            fileList = this.files; /* now you can work with the file list */

            for (var i = 0; i < this.files.length; i++) {
                if (this.files[i].size > 12582912) {
                    excludeFileList.push(this.files[i].name);
                    showAlert("One or more files are larger than 12 MB, they are excluded and will not be uploaded!", 7000)
                } else if (imageCount >= 12) {
                    showAlert("Maximum number of files to be uploaded is 12! One or more files will not be uploaded!", 7000);
                } else {
                    const result = await toBase64(this.files[i])
                    fileObjects.push({ image: result, file: fileList[i], id: uuidv4(fileObjects.length), orgImage: result });
                    pendingUpload = true;
                    $("#upload").css("display", "block");
                    $("#saveBtn").css("display", "none");
                    $("#upload").removeClass("disabled");
                    imageCount++;
                }
            }
            dragViewModel.loadImages(fileObjects)

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
    $("#saveBtn").on("click", function () {
        for (var i in fileObjects) {
            if (fileObjects[i].id.startsWith("11")) {
                return null;
            }
        }
        imageOrderChange(dragViewModel.getListedImageIds());


    });
    $("#upload").on("click", function () {
        if (!$("#upload").hasClass("disabled")) {
            var formData = new FormData();
            var stringImageIds = "";
            for (var i in fileObjects) {
                if (fileObjects[i].id.startsWith("11")) {

                    formData.append("files", fileObjects[i].file);
                    stringImageIds += fileObjects[i].id + "|";
                }
            }
            $.ajax(
                {
                    url: "/home/upload?imageIds=" + stringImageIds,
                    data: formData,
                    processData: false,
                    contentType: false,
                    type: "POST",
                    success: function (data) {
                        if (data.status == "ERR") {
                            showAlert("Unsupported format or image is larger than 9000px x 9000px!", 5000);
                        } else if (data.status == "MAX") {
                            showAlert("The maximum limit is exceeded!", 5000);

                        } else {
                            var items = data.items;
                            var listedItemsId = dragViewModel.getListedImageIds();
                            for (var i in items) {
                                for (var p in fileObjects) {
                                    if (fileObjects[p].id === items[i].oldId) {
                                        fileObjects[p].id = items[i].newId;
                                        break;
                                    }
                                }
                                for (var q in listedItemsId) {
                                    if (listedItemsId[q] === items[i].oldId) {
                                        listedItemsId[q] = items[i].newId;
                                        break;
                                    }
                                }
                            }
                            imageOrderChange(listedItemsId);
                            loadImages();

                            $("#upload").css("display", "none");
                            $("#saveBtn").css("display", "block");
                        }

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
                    if (data.items.length > 0) {
                        $("#saveBtn").removeClass("disabled");
                    }   
                    fileObjects = data.items;
                    dragViewModel.loadImages(data.items);
                    imageCount = data.items.length;
                }
            }
        });
    }
    function deleteImage(id) {
        for (var i = 0; i < fileObjects.length; i++) {
            if (fileObjects[i].id === id) {
                fileObjects.splice(i, 1);
                break;
            }
        }
        if (id.startsWith("11")) {
            pendingUpload = false;
            for (var p in fileObjects) {
                if (fileObjects[p].id.startsWith("11")) {
                    pendingUpload = true;
                }
            }
            if (pendingUpload) {
                $("#upload").css("display", "block");
                $("#saveBtn").css("display", "none");
            } else {
                $("#upload").css("display", "none");
                $("#saveBtn").css("display", "block");
            }
        } else {
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
        if (fileObjects.length === 0) {
            $("#upload").css("display", "none");
            $("#saveBtn").css("display", "block");
            $("#saveBtn").addClass("disabled");
            $("#clearAll").addClass("disabled");
        }
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
                $("#upload").css("display", "none");
                $("#saveBtn").css("display", "block");
                $("#saveBtn").addClass("disabled");
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
            }
        });
    }
    function uuidv4(i) {
        return ('11xxxxxxxx-xxxx-xxx-yxxx-xxxxxxxxxxxxll' + i).replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
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

