/*global window, document, chrome, console, Image, gsUtils */

(function () {

    'use strict';
    var gsUtils = chrome.extension.getBackgroundPage().gsUtils;

    function generateFaviconUri(url, callback) {
        var img = new Image(),
            boxSize = 9;

        img.onload = function () {
            var canvas,
                context;
            canvas = window.document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            context = canvas.getContext('2d');
            context.globalAlpha = 0.5;
            context.drawImage(img, 0, 0);

            callback(canvas.toDataURL());
        };
        img.src = url || chrome.extension.getURL('default.ico');
    }

    function setFavicon(favicon) {
        document.getElementById('gsFavicon').setAttribute('href', favicon);

        setTimeout(function () {
            document.getElementById('gsFavicon').setAttribute('href', favicon);
        }, 1000);
    }

    function htmlEncode(html) {
        return document.createElement('a').appendChild(document.createTextNode(html)).parentNode.innerHTML;
    }

    function attemptTabSuspend() {
        var url = gsUtils.getSuspendedUrl(window.location.hash),
            tabProperties,
            rootUrlStr,
            showPreview = gsUtils.getOption(gsUtils.SHOW_PREVIEW),
            favicon;

        //just incase the url is a suspension url (somehow??) then decode it
        while (url.indexOf('suspended.html#') >= 0) {
            url = gsUtils.getSuspendedUrl(url.substring(url.indexOf('suspended.html#') + 14));
            window.location.hash = 'uri=' + url;
        }
        rootUrlStr = gsUtils.getRootUrl(url);

        //try to fetch saved tab information for this url
        gsUtils.fetchTabInfo(url).then(function(tabProperties) {

            //if we are missing some suspend information for this tab
            if (!tabProperties) {
                tabProperties = {url: url};
            }

            //set favicon and preview image
            if (showPreview) {
                gsUtils.fetchPreviewImage(url, function (previewUrl) {
                    if (previewUrl && previewUrl !== null) {
                        document.getElementById('suspendedMsg').style.display = 'none';
                        document.getElementById('gsPreview').style.display = 'block';
                        document.getElementById('gsPreviewImg').setAttribute('src', previewUrl);
                    } else {
                        document.getElementById('gsPreview').style.display = 'none';
                        document.getElementById('suspendedMsg').style.display = 'table-cell';
                    }
                });
            } else {
                document.getElementById('gsPreview').style.display = 'none';
                document.getElementById('suspendedMsg').style.display = 'table-cell';
            }

            favicon = tabProperties.favicon || 'chrome://favicon/' + url;

            generateFaviconUri(favicon, function (faviconUrl) {
                setFavicon(faviconUrl);
            });

            //populate suspended tab bar
            var title = tabProperties.title ? tabProperties.title : rootUrlStr;
            document.getElementById('gsTitle').innerHTML = htmlEncode(title);
            document.getElementById('gsTopBarTitle').innerHTML = htmlEncode(title);
            document.getElementById('gsTopBarTitle').setAttribute('href', url);
            document.getElementById('gsWhitelistLink').innerText = 'Add ' + rootUrlStr + ' to whitelist';
            document.getElementById('gsWhitelistLink').setAttribute('data-text', rootUrlStr);

            document.getElementById('gsTopBarImg').setAttribute('src', favicon);
        });
    }

    function unsuspendTab() {
        var url = gsUtils.getSuspendedUrl(window.location.hash);
        window.location.replace(url);
    }

    function hideNagForever() {
        gsUtils.setOption(gsUtils.NO_NAG, true);
        document.getElementById('dudePopup').style.display = 'none';
        document.getElementById('donateBubble').style.display = 'none';
    }

    window.onload = function () {
        //handler for unsuspend
        document.getElementById('suspendedMsg').onclick = unsuspendTab;
        document.getElementById('gsPreview').onclick = unsuspendTab;

        //handler for whitelist
        document.getElementById('gsWhitelistLink').onclick = function (e) {
            gsUtils.saveToWhitelist(e.target.getAttribute('data-text'));
            unsuspendTab();
        };

        //handler for donate options
        document.getElementById('donateBubble').onclick = hideNagForever;

        //mark tab as suspended
        //sendSuspendedMessage();

        //try to suspend tab
        attemptTabSuspend();

        //show dude and donate link (randomly 1 of 10 times)
        if (!gsUtils.getOption(gsUtils.NO_NAG) && Math.random() > 0.9) {
            window.addEventListener('focus', function () {
                document.getElementById('dudePopup').setAttribute('class', 'poppedup');
                document.getElementById('donateBubble').setAttribute('class', 'fadeIn');
            });
        }
    };

    window.addEventListener('keydown', function(event) {
        if (event.keyCode === 13 || event.keyCode === 32 || event.keyCode === 40 || event.keyCode === 116) {
            event.preventDefault();
            unsuspendTab();
        }
    });

    /*
    window.onbeforeunload = function () {
        //update url with suspended url
        var url = gsUtils.generateSuspendedUrl(window.location.href);
        window.history.replaceState(null, null, url);
        document.body.style.cursor = 'wait';
    };
    */

}());
