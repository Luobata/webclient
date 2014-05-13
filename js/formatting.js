/*
 * This file contains functions to help to format HTML for PO-way
 */

$.tmpls = {};
$.tmpl = function (selector) {
    if (!$.tmpls.hasOwnProperty(selector)) {
        $.tmpls[selector] = $($.parseHTML($(selector).html())[1]);
    }

    return $.tmpls[selector].clone();
};

$(function () {
    $(document).on("click", "a", function (event) {
        var href = this.href,
            sep, cmd, payload, pid;

        if (/^po:/.test(href)) {
            event.preventDefault();

            sep = href.indexOf("/");
            cmd = href.slice(3, sep);
            payload = decodeURIComponent(href.slice(sep + 1));

            // Add other commands here..
            pid = webclient.players.id(payload);
            if (pid === -1) {
                pid = parseInt(payload, 10);
            }

            if (cmd === "join") {
                webclient.joinChannel(payload);
            } else if (cmd === "pm") { // Create pm window
                if (!isNaN(pid)) {
                    webclient.pms.pm(pid).activateTab();
                }
            } else if (cmd === "ignore") {
                // Ignore the user
                if (!isNaN(pid)) {
                    if (webclient.players.isIgnored(pid)) {
                        webclient.players.addIgnore(pid);
                    } else {
                        webclient.players.removeIgnore(pid);
                    }
                }
            } else if (cmd === "watch") {
                network.command('watch', {battle: +payload});
            } else if (cmd === "send") {
                webclient.channel.sendMessage(payload);
            } else if (cmd === "setmsg") {
                webclient.channel.chat.input.val(payload);
            } else if (cmd === "appendmsg") {
                webclient.channel.chat.input.val(webclient.channel.chat.input.val() + payload);
            }
            // TODO: watchbattle(id/name), reconnect(void)
        } else {
            /* Make sure link opens in a new window */
            this.target = "_blank";
        }
    });
});

(function () {
    var iframe = document.createElement('iframe');
    var hasIframeSandbox = 'sandbox' in iframe;

    function convertImages(element) {
        element = $(element);
        element.find("img").each(function (index, img) {
            img = $(img);
            var src = img.attr("src").split(":"),
                proto = src[0],
                query = src[1];

            switch (proto) {
                case "pokemon":
                    query = "?" + query;
                    var poke = pokeinfo.toArray(utils.queryField("num", query.slice(1).split("&")[0], query) || "1"),
                        gen = utils.queryField("gen", "6", query),
                        shiny = utils.queryField("shiny", "false", query) === "true",
                        gender = utils.queryField("gender", "male", query),
                        back = utils.queryField("back", "false", query) === "true",
                        cropped = utils.queryField("cropped", "false", query) === "true";

                    img.error(function () {
                        if (gender == "female") {
                            gender = "male";
                        } else if (gen < 6) {
                            gen = 6;
                        } else if (gen === 6) {
                            gen = 5;
                        } else if (shiny) {
                            shiny = false;
                        } else if (back) {
                            back = false;
                        } else {
                            return;
                        }

                        img.attr("src", pokeinfo.sprite({num: pokenum, forme: poke[1], female: gender === "female", shiny: shiny}, {gen: gen, back: back}));
                    }).attr("src", pokeinfo.sprite({num: poke[0], forme: poke[1], female: gender === "female", shiny: shiny}, {gen: gen, back: back}));
                    break;
                case "trainer":
                    img.attr("src", pokeinfo.trainerSprite(query));
                    break;
                case "http":
                case "https":
                case "data": /* base64 */
                    break;
                default:
                    console.log("Unknown protocol: " + proto);
                    break;
            }
        });
        return element;
    }

    function sandboxHtml(selector, html) {
        html = html || '';
        var elem = $(selector),
            containsHtml = html.contains("<"),
            secureIframe, formattedHtml,
            contentDocument, contentBody;

        if (!elem.length) {
            return;
        }

        if (containsHtml && hasIframeSandbox) {
            // If we want to format html, we will have to use a sandboxed iframe.
            // Otherwise things like
            // <img src='xss' onerror='alert("xss");">
            // Will execute

            // To access the contentDocument, we must set allow-same-origin and allow-script (we remove allow-scripts once we inject HTML
            elem[0].innerHTML = "<iframe width='100%' frameborder='0' seamless sandbox='allow-same-origin allow-scripts'></iframe>";
            secureIframe = elem[0].getElementsByTagName("iframe")[0];
            if (!secureIframe) {
                elem.text(html);
                return;
            }

            contentDocument = secureIframe.contentDocument;
            contentBody = contentDocument.body;

            secureIframe.sandbox = 'allow-same-origin';
            // There is a really complicated security problem going on here.
            // We can't just run format on html, otherwise events are executed:
            // <img src='xss' onerror='alert("xss");">
            // This is because html is executed on the master window ($("<div>").html(...))

            // We first set the html (which is safe, thanks to sandbox)
            contentBody.innerHTML = html;

            // Then format that
            convertImages(contentBody);
            formattedHtml = contentBody.innerHTML;

            // Then add the formatted html
            contentBody.innerHTML = "<link rel=\"stylesheet\" href=\"css/style.css\">" + formattedHtml;

            // Remove allow-same-origin (just in case)
            secureIframe.sandbox = '';
        } else {
            elem.text(html);
        }
    }

    webclient.convertImages = convertImages;
    webclient.sandboxHtml = sandboxHtml;
}());
