

var dragViewModel = (function () {

	var _doc = window.document;

	var _numOfImageSlots = 12,
		_numOfImagesPerRow = 5,
		_imageMarginBottom = 30;

	var _imageAspectWidth = 100,
		_imageAspectHeight = 100;

	var _imageSlots = [],
		_selectedImageElement = null,
		_originalImageSlot = null,
		_originalClickCoords = null,
		_lastTouchedSlotId = null;

	var _imageLibrary = [],
		_listedImageIds = [];

	function loadImages(data) {
		$(".dd-slot").remove();
		$(".dd-item").remove();
		_imageLibrary = data;
		_numOfImageSlots = data.length;
		_listedImageIds = [];
		for (var i in data) {
			_listedImageIds.push(data[i].id);
		}
		init();
	}
	function setOrderChangeCallback(func) {
		this.orderChangeCallback = func;
		console.log(func);
		this.orderChangeCallback();
    }

	function init() {

		$(".dd-slot").remove();
		$(".dd-item").remove();
		addImageSlots();
		drawImages();

		_doc.getElementById('dragDrop').addEventListener('mousemove', imageMousemove);
		$(".m-image-delete").on("click", deleteImage);
		$(".dd-item").on("dblclick", doubleClick);
		$("#clearAll").on("click", deleteAll);
		if (_imageLibrary.length > 0) {
			$("#clearAll").removeClass("disabled");
		}
	}

	function addImageSlots() {

		var i = 0,
			len = _numOfImageSlots,
			item;

		var wrap = _doc.getElementById('dragDrop');

		for (; i < len; i++) {

			item = _doc.createElement('div');

			item.setAttribute('class', 'dd-slot');
			item.setAttribute('style', 'width:' + (100 / _numOfImagesPerRow) + '%;padding-bottom:' + ((100 / _numOfImagesPerRow) * (_imageAspectHeight / _imageAspectWidth)) + '%;margin-bottom:' + _imageMarginBottom + 'px;');

			wrap.appendChild(item);

		}

	}
	function deleteImage(element) {
		imageUploaderViewModel.deleteImage(element.target.dataset.id);
		var index = getIndexOfImageId(element.target.dataset.id);
		console.log(element);
		_listedImageIds.splice(index, 1);
		$(".dd-item[data-image-id=" + element.target.dataset.id + "]").remove();
	
		arrangeItems();
	}
	function doubleClick(element) {
		window.open(window.location.origin + "/" + getImageById(element.target.dataset.id).orgImage)
	}
	function deleteAll() {
		if (!$("#clearAll").hasClass("disabled")) {
			_listedImageIds.splice(0, _listedImageIds.length);
			$(".dd-item").remove();
			arrangeItems();
			imageUploaderViewModel.deleteAll();
			$("#clearAll").addClass("disabled");
			_numOfImageSlots = 0;
		}
    }

	function drawImages() {
        try {
			var i = 0,
				len = _numOfImageSlots,
				item;

			var wrap = _doc.getElementById('dragDrop');

			var slot = _doc.getElementsByClassName('dd-slot')[0],
				bounds = slot.getBoundingClientRect(),
				itemWidth = bounds.width,
				itemHeight = bounds.height;

			var itemX,
				itemY;

			var imageId,
				image;

			for (; i < len; i++) {

				imageId = _listedImageIds[i] || -1;
				image = getImageById(imageId);

				itemX = (i % _numOfImagesPerRow) * itemWidth;
				itemY = Math.floor(i / _numOfImagesPerRow) * (itemHeight + _imageMarginBottom);

				item = _doc.createElement('div');

				item.setAttribute('class', 'dd-item dd-transition' + (imageId < 0 ? ' dd-disabled' : ''));
				item.setAttribute('data-image-id', imageId);
				item.setAttribute('style', 'width:' + itemWidth + 'px;height:' + itemHeight + 'px;transform:translate3d(' + itemX + 'px,' + itemY + 'px,0);');

				item.innerHTML = '<div class="dd-item-inner dd-shadow" data-id="' + imageId + '" style = "' + (image ? ('background-image:url(' + image.image + ')') : '') + '" > <button class="m-image-delete"' + 'data-id="' + imageId + '" >✖</button ></div > ';

				wrap.appendChild(item);

				item.addEventListener('mousedown', imageMousedown);
				item.addEventListener('mouseup', imageMouseup);

				_imageSlots[i] = { width: itemWidth, height: itemHeight, x: itemX, y: itemY };

			}

        } catch (e) {

        }
		
	}
	function arrangeItems() {

		var i = 0,
			len = _listedImageIds.length,
			slot,
			ele;

		for (; i < len; i++) {

			slot = _imageSlots[i];
			ele = _doc.querySelector('[data-image-id="' + _listedImageIds[i] + '"]');

			ele.style.transform = 'translate3d(' + slot.x + 'px,' + slot.y + 'px,0)';

		}

	}

	function imageMousedown(event) {

		if (!_selectedImageElement) {

			_selectedImageElement = event.currentTarget;
			_originalClickCoords = { x: event.pageX, y: event.pageY };
			_originalImageSlot = getIndexOfImageId(_selectedImageElement.getAttribute('data-image-id'));

			_selectedImageElement.classList.add('dd-selected');
			_selectedImageElement.classList.remove('dd-transition');

		}

	}

	function imageMousemove(event) {

		if (_selectedImageElement) {

			var wrap = _doc.getElementById('dragDrop'),
				bounds = wrap.getBoundingClientRect(),
				left = bounds.left,
				top = bounds.top;

			var pageX = event.pageX,
				pageY = event.pageY;

			var clickX = pageX - left,
				clickY = pageY - top,
				hoverSlotId = getSlotIdByCoords({ x: clickX, y: clickY });

			var ele = _selectedImageElement,
				imageId = ele.getAttribute('data-image-id'),
				index = _originalImageSlot,
				newIndex = getIndexOfImageId(imageId),
				x = _imageSlots[index].x,
				y = _imageSlots[index].y;

			var resultX = x + (pageX - _originalClickCoords.x),
				resultY = y + (pageY - _originalClickCoords.y);

			if (hoverSlotId != undefined && _lastTouchedSlotId != hoverSlotId) {

				_lastTouchedSlotId = hoverSlotId;

				_listedImageIds.splice(hoverSlotId, 0, _listedImageIds.splice(newIndex, 1)[0]);
				arrangeItems();

			}

			ele.style.transform = 'translate3d(' + resultX + 'px,' + resultY + 'px,0)';

		}

	}
	function imageMouseup() {

		_selectedImageElement.classList.remove('dd-selected');
		_selectedImageElement.classList.add('dd-transition');

		_selectedImageElement = null;
		_originalClickCoords = null;

		imageUploaderViewModel.imageOrderChange(_listedImageIds);

		arrangeItems();

	}

	function getSlotIdByCoords(coords) {

		// Get the current slot being hovered over
		for (var id in _imageSlots) {

			var slot = _imageSlots[id];

			if (slot.x <= coords.x && coords.x <= slot.x + slot.width && slot.y <= coords.y && coords.y <= slot.y + slot.height)
				return id;

		}

	}
	function getImageById(id) {

		return _imageLibrary.find(function (image) {
			return image.id == id;
		});

	}
	function getIndexOfImageId(id) {

		var i = 0,
			len = _listedImageIds.length;

		for (; i < len; i++)
			if (_listedImageIds[i] == id)
				return i;

	}
	return {
		loadImages: loadImages,
		addCallback: setOrderChangeCallback
    }
})();