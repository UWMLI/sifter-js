$(document).ready(function() {
    /* Template compile speed up test */
    compiledShowTemplate = Mustache.compile($('#showTemplate').html());
});


function ListNote(callback, note, noteId) {
    var self = this; // <- I hate javascript.
    this.html = "";
    this.note = note;
    this.callback = callback;

    this.constructHTML = function() {
        var noteImage = getImageToUse(note);

        if (noteImage != "") {
            /* Get Data */
            var data = {}
            data.image_url = noteImage;
            data.note_id = noteId;

            data.category_class = getTagIconName(note);

            /* Render View */
            var template = $('#gridIconTemplate').html();
            var view = Mustache.render(template, data);

            this.html = $(view).get(0);
        } else {
            this.html = $("<div></div>").get(0); //clear out the entire node if no media
            console.log("Error: Note with no image in database: noteID# " + noteId); //since this shouldn't happen, log it if it does
        }

        $(this.html).find('.sifter-grid-image').on('click', function() {
            self.callback(self);
        });
    }
    this.constructHTML();
}

function NoteView(note) {
    var thism = this; // FIXME needs better name, like view
    this.note = note;
    model.currentNote = note; // this is done so that the send email function over in controller can get at all the information



    //this.html.children[0] is for the image
    //this.html.children [1][0] Caption 
    //this.html.children [1][1] Audio
    //this.html.children [1][2] Tags
    //this.html.children [1][3] Comments
    //this.html.children [1][4] Inputs (of more comments)
    //this.html.children [1][5] Social Media
    this.constructHTML = function() {
        /* Get Data */
        var data = {};

        data.image_url = getImageToUse(this.note);
        data.category_class = getTagIconName(this.note);
        data.audio_url = getAudioToUse(this.note);
        data.details = getTextToUse(this.note);
        data.comments = this.getCommentsJson(this.note.comments.data);
        data.logged_in = controller.logged_in();
        data.emailShare = this.note.email_shares;
        data.likeShare = this.note.note_likes;

        data.author = parseInt(model.playerId) === parseInt(this.note.user_id) ? "You" : this.note.user_name;
        data.isAuthor = parseInt(model.playerId) === parseInt(this.note.user_id) ? true : false; //TODO: need real authentication for this
        data.createdDate = new Date(this.note.created.replace(' ', 'T') + '-06:00').toLocaleString();
        // TODO: figure out how timestamp timezones differ between aris v1 and v2
        // (in v1 this.note.created was UTC)
        // this.note.created is "yyyy-mm-dd hh:mm:ss" CST
        // the Date constructor takes "yyyy-mm-ddThh:mm:ss-06:00" to ensure CST interpretation
        // then toLocaleString() uses user timezone

        //TODO: find a better place for these, controller? 
        //TODO: note.tweets and note.pins don't exist on server, replace with style-stripped official counters 
        data.tweetShare = ''; // this.note.tweets ? this.note.tweets : 0;
        data.pinShare = ''; // this.note.pins ? this.note.pins : 0;

        /* Render View */
        var render = compiledShowTemplate(data);
        this.html = $(render).get(0);


        this.likeToggle(this.note.player_liked);

        var iOS = (navigator.userAgent.match(/(iPad|iPhone|iPod)/g) ? true : false);
        var clickEvent = iOS ? 'touchend' : 'click';

        /* Attach login or comment events */
        $(this.html).find('.login-to-comment').on(clickEvent, function() {
            controller.loginRequired(function() {
                controller.noteSelected(thism);
            });
        });

        $(this.html).find('.post-comment').on(clickEvent, function() {
            var text = $(thism.html).find('.sifter-new-comment textarea').val();
            thism.submitComment(thism.note, text)
        });

        $(this.html).find('#shareDelete').on(clickEvent, function() {
            if (confirm("Are you sure you want to delete this note?")) {
                controller.deleteNote(thism.note.note_id);
                controller.hideNoteView();
            }
        });

        $(this.html).find('.edit-comment-pencil').on(clickEvent, function(e) {
            var menu = $(e.target).siblings('.edit-comment');
            menu.is(':hidden') ? menu.show() : menu.hide();
        });

        $(this.html).find('.edit-comment-delete').on(clickEvent, function(e) {
            var commentID = parseInt( $(e.target).parents('.edit-comment-box').attr('data-comment-id') );
            if (confirm('Are you sure you want to delete this comment?')) {
                controller.deleteComment(thism.note.note_id, commentID);
                controller.noteSelected({note: thism.note});
            }
            var menu = $(e.target).parents('.edit-comment');
            menu.is(':hidden') ? menu.show() : menu.hide();
        });

        /* TODO social stuff, new comment logic */

        // when share email clicked, send an email
        $(this.html).find('#shareEmailBox').on('click', function() {
            controller.sendEmail(model.playerId, model.currentNote.note_id);
        });

        $(this.html).find('#shareTweetBox').on('click', function() {
            controller.sendTweet(model.playerId, model.currentNote.note_id);

            //get tweet count from twitter
            $.getJSON("http://cdn.api.twitter.com/1/urls/count.json?callback=?&url=" + encodeURIComponent(document.location.href + "#/" + note.note_id), function(data) {
                console.log("tweet count is: " + data.count);
                // document.getElementById('shareTweet').innerHTML = data.count ? data.count : 0;
            });
        });

        $(this.html).find('#shareEditBox').on('click', function() {
            var menu = $('#shareEditMenu');
            if (menu.is(':hidden')) {
                menu.show();
            }
            else {
                menu.hide();
            }
        });

        $(this.html).find('#sharePinBox').on('click', function() {
            controller.getPinLink(model.playerId, model.currentNote.note_id);
            //TODO: increment html for pin
            // document.getElementById('sharePin').innerHTML = note.pins;

        });

        $(this.html).find('#shareEditDescription').on('click', function() {
            $('#sifter-show-description').hide();
            $('#sifter-edit-description').show();
        });

        $(this.html).find('#sifter-cancel-description').on('click', function() {
            $('#sifter-edit-description').hide();
            $('#sifter-show-description').show();
        });

        $(this.html).find('#sifter-save-description').on('click', function() {
            var text = $('#sifter-edit-description textarea').val();
            controller.editDescription(model.currentNote.note_id, text);
        });

    }

    //Is this still in use? - Jazmyn
    this.old_constructHTML = function() {
        if (!this.note) return;

        //load content
        var imgcontent;
        var audcontent;
        var textcontent;

        for (var i = 0; i < this.note.contents.length; i++) {
            switch (this.note.contents[i].type) {
                case 'PHOTO':
                    imgcontent = this.note.contents[i].media.data;
                    break;
                case 'AUDIO':
                    audcontent = this.note.contents[i].media.data;
                    break;
                case 'TEXT':
                    textcontent = this.note.contents[i].text;
                    break;
                default:
                    console.log("Error in parsing note content type in NoteView");
            }
        }

        //display image
        if (imgcontent != null)
            this.html.children[0].innerHTML = '<img class="note_media" style="width:500px;height:500px;" src="' + imgcontent.url + '" />';


        //dispaly text
        this.html.children[1].children[0].innerHTML += 'Caption: ' + textcontent;

        //dispaly audio
        if (audcontent != null) {
            var audioHTML = 'Audio:' + '<br> <audio controls id="audioPreview" > <source src="' + audcontent.url + ' " ';
            audioHTML += 'type="audio/mpeg">';
            audioHTML += 'Your browser does not support the audio element. </audio>';
            this.html.children[1].children[1].innerHTML += audioHTML;
        }

        //display tags
        this.html.children[1].children[2].innerHTML += ' Tags: ' + this.note.tagString + '<br><br><br>';

        //display comments
        this.loadComments();

        //start social media build
        var shareHTML = "<ul class='shares'>"; //this has to be assembled in a string and added to .innerHTML all at once or it adds returnlines


        //if user is logged in, let them submit comments. Else, prompt them to login 
        if (model.playerId > 0) {
            var t = document.createElement('textarea');
            t.id = "commentInput";
            t.rows = "4";
            t.placeholder = "add comment";
            this.html.children[1].children[4].appendChild(t);

            var b = document.createElement('button');
            b.id = 'commentSubmit';
            b.className = 'button';
            b.onclick = function() {
                thism.submitComment(thism.note, t.value);
            };
            b.innerHTML = 'Submit';

            //check to see if user has liked the note yet, and display the appropriate button

            this.likeToggle(this.note.player_liked);

            shareHTML += "<li>" + this.note.facebook_shares + " Facebook </li>   ";
            //  document.getElementById('shareFacebook').innerHTML = this.note.facebook_shares + " Facebook!";
            //above only works second time you run it

        } else {
            var b = document.createElement('button');
            b.id = 'loginToComment';
            b.classname = 'button';
            b.onclick = controller.showLoginView;
            b.innerHTML = 'Login to Comment';

            //they can't submit to social media if they are not logged in, show static numbers

            // document.getElementById('shareFacebook').innerHTML = this.note.facebook_shares + " Facebook";
            // document.getElementById('shareLikes').innerHTML = this.note.note_likes + " " + model.views.likeIcon;    

            var likeButtonHTML = this.note.note_likes + " " + model.views.likeIcon;

            shareHTML += "<li>" + likeButtonHTML + "</li>   ";
            var facebookButtonHTML = this.note.facebook_shares;
            shareHTML += "<li>" + facebookButtonHTML + " Facebook </li>   ";

        }

        this.html.children[1].children[4].appendChild(b);
        document.getElementById('shareLikes').innerHTML = ""; //supposed to be button, doesn't work yet

        //Social Media   
        shareHTML += "<li>" + this.note.twitter_shares + " Twitter </li>   ";
        shareHTML += "<li>" + this.note.pinterest_shares + " Pinterest </li>   ";

        //  emailButtonHTML = "<button id='emailButton' class='button' onClick=controller.sendEmail(model.playerId, thism.note.note_id)> "
        emailButtonHTML = "<button id='emailButton' class='button' onClick=controller.sendEmail(" + model.playerId + "," + thism.note.note_id + ")>";

        shareHTML += "<li>" + emailButtonHTML + this.note.email_shares + " Emails</button> </li>   ";

        shareHTML += "</ul>";

        this.html.children[1].children[5].innerHTML += shareHTML; //this ends up in [1][5]
        //  this.html.children[1].children[5].appendChild(emailButton);

    }

    this.getCommentsJson = function(comments) {
        return $(comments).map(function() {
            return {
                author: this.user.user_name,
                text: this.description,
                canDelete: parseInt(model.playerId) === parseInt(this.user_id),
                commentID: parseInt(this.note_comment_id),
            };
        }).toArray();
    }

    this.loadComments = function() {
        this.html.children[1].children[3].innerHTML = 'Comments: ';
        for (var i = 0; i < thism.note.comments.length; i++)
            thism.html.children[1].children[3].appendChild(thism.constructCommentHTML(thism.note.comments[i]));
    }

    this.submitComment = function(note, comment) {
        if (comment === '') return;
        if (model.playerId > 0) {
            // now add it to the server copy and re-display the updated note
            controller.addCommentToNote(note.note_id, comment, function(status) {
                if (status.returnCode > 0) {
                    // User is probably not really logged in
                    alert('Error while posting comment! Try logging out and back in, then retry your comment.');
                }
                else {
                    // All good
                    note.comments.data.push( status.data );
                    controller.noteSelected(thism);
                }
            });
        } else {
            controller.showLoginView();
        }
    }

    this.constructCommentHTML = function(comment) {
        var commentHTML = document.getElementById('note_comment_cell_construct').cloneNode(true);
        var splitDateCreated = comment.created.split(/[- :]/);
        var dateCreated = new Date(splitDateCreated[0], splitDateCreated[1] - 1, splitDateCreated[2], splitDateCreated[3], splitDateCreated[4], splitDateCreated[5]);

        commentHTML.children[0].innerHTML = '<br>' + comment.username + ' (' + dateCreated.toLocaleString() + '):';
        var commenttext = document.getElementById('note_content_cell_construct').cloneNode(true);
        commenttext.setAttribute('id', '');
        commenttext.innerHTML = comment.title;
        commentHTML.appendChild(commenttext);
        return commentHTML;
    }

    this.likeToggle = function(hasLiked) {
        //user may or maynot have already like the note, this changes the display and effect of clicking  

        //check to see if they are logged in
        if (!model.playerId == 0) {
            if (hasLiked == 0) { //the user has not yet liked it
                //then allow them to like it  

                $(this.html).find('#shareLikeBox').on('click', function() {
                    thism.likeNote();
                });

            } else if (hasLiked == 1) { //user has already liked the note

                //show filled heart for liking
                $(this.html).find("#shareLike").removeClass("glyphicon-heart-empty").addClass("glyphicon-heart");

                //set onclick to unliking
                $(this.html).find('#shareLikeBox').on('click', function() {
                    thism.unlikeNote();
                });
            }
        } else {
            //they have not yet logged in, so clicking the button should prompt them to
            $(this.html).find('#shareLikeBox').on('click', function() {
                controller.loginRequired(function() {
                    controller.noteSelected(thism);
                });
            });
        }

    }

    this.likeNote = function() {
        //increment the number of likes which display
        this.note.note_likes = parseInt(this.note.note_likes) + 1;
        var likeB = document.getElementById('shareLike');
        likeB.innerHTML = this.note.note_likes;

        //update button
        $("#shareLike").removeClass("glyphicon-heart-empty").addClass("glyphicon-heart");

        //tell server that you liked it
        controller.like(model.playerId, this.note.note_id);

        //set player liked toggle for this note
        this.note.player_liked = 1;

        //clear out old event handler with .off and add new one with .on 
        $(this.html).find('#shareLike').off('click').on('click', function() {
            thism.unlikeNote();
        });

    }

    this.unlikeNote = function() {
        //decrement the number of likes which display
        this.note.note_likes = parseInt(this.note.note_likes) - 1;
        var likeB = document.getElementById('shareLike');
        likeB.innerHTML = this.note.note_likes;

        //update button
        $(this.html).find("#shareLike").removeClass("glyphicon-heart").addClass("glyphicon-heart-empty");

        //tell server that you unliked it
        controller.unlike(model.playerId, this.note.note_id);

        //set player liked toggle for this note
        this.note.player_liked = 0;

        //clear out old event handler with .off and add new one with .on 
        $(this.html).find('#shareLike').off('click');
        $(this.html).find('#shareLike').on('click', function() {
            thism.likeNote();
        });

    }

    this.constructHTML();
}




function getLocation() {
    if (navigator.geolocation) return navigator.geolocation.getCurrentPosition();
    else return "Geolocation is not supported by this browser.";
}

function submitNote() {
    //TODO dismiss the keyboard on mobile 
    // document.activeElement.blur();
    // $("input").blur();
    // console.log("keyboard go away");

    model.currentNote.text = document.getElementById("caption").value;

    // check for required stuff 
    var requirementsMet = true;
    var errors = [];

    $('.error').removeClass('error');

    if ($('#in-camera')[0].files < 1) {
        errors.push("select an image");
        $('.camera_box').addClass('error');
        requirementsMet = false;
    }

    if (!model.currentNote.text) //if string is not empty, null or blank
    {
        errors.push("write a caption");
        $('#caption').addClass('error');
        requirementsMet = false;
    }

    /*
    //map pin starts at default location in lake where no notes are expected. 
    //Google maps map move the pin slightly during map creation, so can't do an exact == comparison
    if (Math.abs(model.currentNote.lat - model.views.defaultLat) < .0001 && Math.abs(model.currentNote.lon - model.views.defaultLon) < .0001) {
        errors.push("choose a location");
        // TODO add error to location
        requirementsMet = false;
    }
    */

    if (!requirementsMet) {
        alert("Please " + errors.join(", "));
    } else {
        controller.oneStepNote();
        controller.hideCreateNoteView();
    }
}


function MapMarker(callback, note) {
    var self = this; // <- I hate javascript.
    this.callback = callback;
    this.note = note;

    var imageMarker = new RichMarker({
        position: this.note.geoloc,
        map: model.views.gmap,
        draggable: false,
        content: constructSVGMarker(this.note)
    });

    this.marker = imageMarker;
    model.views.markerclusterer.addMarker(this.marker);

    google.maps.event.addListener(this.marker, 'click', function(e) {
        self.callback(self);
    });
}

function constructSVGMarker(note) {
    var container = document.createElement('div');
    $(container).addClass("sifter-map-icon"); // scale-icon scale-mustdo");
    var image = document.createElement('img');

    image.src = getTagIconUrl(note);
    $(container).append(image);
    return container;
}

function getImageToUse(note) {
    return note.media.data.url;
}

function getTagIconUrl(note) {
    var lookup = {};

    for (var i = 0; i < model.tags.length; i++) {
        var tag = model.tags[i];
        if (tag.media) {
            lookup[tag.tag] = tag.media.data.url;
        }
    }

    return lookup[note.tag] || "assets/images/icon_search.svg"; // unknown icon
}


function getTagIconName(note) {
    var lookup = {};

    for (var i = 0; i < model.tags.length; i++) {
        var attr = model.tags[i].tag;
        lookup[attr] = "tag_" + (i + 1);
    }

    var icon_name = lookup[note.tag] || "search"; // unknown icon
    return icon_name;
}

function getAudioToUse(note) {
    return "";
};

function getTextToUse(note) {
    return note.description;
};



function handleImageFileSelect(files) {
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        var imageType = /image.*/;

        //only jpg, png and gif allowed
        if (!(file.type.match('image/jpeg') || file.type.match('image/png') || file.type.match('image/gif'))) {
            window.alert("Please select an image file of type .png, .jpg, .gif");
            return;
        }

        var img = document.getElementById("imageThumbnail");
        img.classList.add("obj");
        img.file = file;
        model.currentNote.imageFile = file;

        var reader = new FileReader();
        reader.onload = (function(aImg) {
            return function(e) {
                aImg.src = e.target.result;
                model.currentNote.imageFileURL = e.target.result;
            };
        })(img);

        reader.readAsDataURL(file);
    }
};

function handleAudioFileSelect(files) {
    for (var i = 0; i < files.length; i++) {
        var file = files[i];

        if (!(file.type.match('audio/caf') || file.type.match('audio/mp3') || file.type.match('audio/aac') || file.type.match('audio/m4a'))) {
            window.alert("Please select an audio file of type .mp3, .caf, .aac, .m4a");
            return;
        }

        // preview audio control
        var audioPreview = document.getElementById("audioPreview");
        audioPreview.src = URL.createObjectURL(file);
        model.currentNote.audioFile = file;
    }
};

function showVideo() {
    var canvas = document.getElementById("canvas");
    var context = canvas.getContext("2d");
    var video = document.getElementById("video");
    var videoObj = {
        "video": true
    };
    var errBack = function(error) {
        console.log("Video capture error: ", error.code);
    };

    // Put video listeners into place
    if (navigator.getUserMedia) {
        navigator.getUserMedia(videoObj, function(stream) {
            video.src = stream;
            video.play();
        }, errBack);
    } else if (navigator.webkitGetUserMedia) {
        navigator.webkitGetUserMedia(videoObj, function(stream) {
            video.src = window.webkitURL.createObjectURL(stream);
            video.play();
        }, errBack);
    }

    unhide("video");
    unhide("snap");
};

function recordAudio() {
    try {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;
        window.URL = window.URL || window.webkitURL;

        model.audio_context = new AudioContext;
    } catch (e) {
        alert('No web audio support in this browser!');
    }

    navigator.getUserMedia({
        audio: true
    }, startUserMedia, function(e) {
        console.log('No live audio input: ' + e);
    });

    unhide("startRecording");
    unhide("stopRecording");
};

function cancelNote() {
    //controller.deleteNote(model.currentNote.noteId);
    controller.hideCreateNoteView();
}

function markerMoved(marker, map, html) {
    var point = marker.getPosition();
    map.panTo(point);

    var geocoder = new google.maps.Geocoder();

    geocoder.geocode({
        latLng: point
    }, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK && results[0]) {
            var address_string = results[0].formatted_address;
            document.getElementById('address').innerHTML = address_string;
        }
    });
    model.currentNote.lat = point.lat();
    model.currentNote.lon = point.lng();
}

function handleNoGeolocation(errorFlag) {
    if (errorFlag) var content = 'Error: The Geolocation service failed.';
    else var content = 'Error: Your browser doesn\'t support geolocation.';
}


function unhide(div) {
    var item = document.getElementById(div);

    if (item) {
        if (item.classList.contains('hidden')) item.classList.remove('hidden');
        else item.classList.add('hidden');
    }
}

// audio functionality currently doesn't work, but should based on HTML5 spec.
// keep an eye on https://github.com/mattdiamond/Recorderjs for updates
function startUserMedia(stream) {
    var input = model.audio_context.createMediaStreamSource(stream);
    input.connect(model.audio_context.destination);
    model.recorder = new Recorder(input);
}

function startRecording(button) {
    model.recorder && model.recorder.record();
    button.disabled = true;
    button.nextElementSibling.disabled = false;
}

function stopRecording(button) {
    model.recorder && model.recorder.stop();
    button.disabled = true;
    button.previousElementSibling.disabled = false;

    // create WAV download link using audio data blob
    createDownloadLink();
    //model.recorder.clear();
}

function createDownloadLink() {
    model.recorder && model.recorder.exportWAV(function(blob) {
        var url = URL.createObjectURL(blob);
        var li = document.createElement('li');
        var au = document.createElement('audio');
        var hf = document.createElement('a')
        au.controls = true;
        au.src = url;
        hf.href = url;
        hf.download = new Date().toISOString() + '.wav';
        hf.innerHTML = hf.download;
        li.appendChild(au);
        li.appendChild(hf);
        recordingslist.appendChild(li);
    });
}

function clickBrowseImage() {
    $('#in-camera').click();
}

function clickBrowseAudio() {
    document.getElementById('audioFileInput').click();
}

function clickLogin() {
    var username = document.getElementById('username_login').value;
    var password = document.getElementById('password_login').value;

    controller.login(username, password);
}

function clickNoAccount() {
    controller.showJoinView();
}

function clickViewLoginPage() {
    controller.showLoginView();
}

function clickSignUp() {
    var email = document.getElementById('usermail_join').value;
    var password = document.getElementById('password_join').value;
    var username = document.getElementById('username_join').value;
    controller.createAccount(email, password, username); //CDH added in username
}

function clickForgotPassword() {
    controller.showForgotView();
}

function clickEmailPassword() {

    var usermail = document.getElementById('usermail_forgot').value;


    if (!!usermail) { //email not empty, blank or null

        controller.resetAndEmailPassword(usermail);
    } else
        alert("Enter your e-mail above.");


}

function LoginView() {
    var template = $('#loginTemplate').html();
    var data = {};
    data.fb_enabled = false; // (typeof FB != 'undefined'); //if they have a script blocker with makes FB undefined, don't show the facebook login

    var view = Mustache.render(template, data);

    this.html = $(view).get(0);
}

function JoinView() {
    var template = $('#joinTemplate').html();
    var view = Mustache.render(template);

    this.html = $(view).get(0);
}

function ForgotView() {
    var template = $('#forgotTemplate').html();
    var view = Mustache.render(template);

    this.html = $(view).get(0);
}

function NoteCreateView() {
    var thism = this; // FIXME needs better name, like view

    /* Constructor */
    this.initialize = function() {
        var data = {};
        data.categories = getTagListForRender();

        /* Render */
        var template = $('#newTemplate').html();
        var view = Mustache.render(template, data);

        this.html = $(view).get(0);

        controller.createNewNote();
        //this.initialize_map ();


        /* Events */
        $(this.html).find('#in-camera').on('change', function(){
            var file = $('#in-camera')[0].files[0];
            EXIF.getData(file, function(){
                var orientation = EXIF.getTag(file, 'Orientation') || 1;

                var photoReader = new FileReader();
                photoReader.onload = function(){
                    $('.center-big').removeClass('center-big').addClass('left-small');
                    var photoData = photoReader.result;
                    $('#show-image-div').html('<div class="square-dummy"></div><div id="show-image" class="exif-'+orientation+'" style="background-image: url('+photoData+');"></div>');
                };
                photoReader.readAsDataURL(file);
            });
        });
    };


    /* Methods */
    this.initialize_map = function() {
        /* Map and Marker */
        var mapOptions = {
            zoom: MAP_ZOOM_LEVEL,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            panControl: false,
            zoomControl: false,
            mapTypeControl: false,
            scaleControl: false,
            streetViewControl: false,
            overviewMapControl: false
        };
        var map = new google.maps.Map(document.getElementById('mapCanvas'), mapOptions);

        var pos = new google.maps.LatLng(MAP_CENTER_LATITUDE, MAP_CENTER_LONGITUDE);
        map.setCenter(pos);

        marker = new google.maps.Marker({
            map: map,
            position: pos,
            draggable: true
        });

        google.maps.event.addListener(marker, 'dragend', function() {
            markerMoved(marker, map);
        });

        markerMoved(marker, map);


        /* Locate User */
        if (navigator.geolocation) //this may take time to complete, so it'll just move the default when it's ready
        {
            function positionFound(position) {
                if (!position) {
                    return;
                }
                pos = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
                map.setCenter(pos);
                marker.setPosition(pos);
                markerMoved(marker, map);
            }

            function positionNotFound() {
                handleNoGeolocation(true);
            }

            navigator.geolocation.getCurrentPosition(positionFound, positionNotFound);
        }


        /* Auto complete location */
        var input = document.getElementById('searchTextField');
        var autocomplete = new google.maps.places.Autocomplete(input);
        autocomplete.bindTo('bounds', map);

        google.maps.event.addListener(autocomplete, 'place_changed', function() {
            var place = autocomplete.getPlace();
            if (place.geometry.viewport) {
                map.fitBounds(place.geometry.viewport);
            } else {
                map.setCenter(place.geometry.location);
                map.setZoom(17); // Why 17? Because it looks good.
            }

            marker.setPosition(place.geometry.location);
            markerMoved(marker, map);

            var address = '';
            if (place.address_components) {
                address = [
                    (place.address_components[0] && place.address_components[0].short_name || ''), (place.address_components[1] && place.address_components[1].short_name || ''), (place.address_components[2] && place.address_components[2].short_name || '')
                ].join(' ');
            }
        });
    };


    this.initialize();
    setTimeout(this.initialize_map, 300);
}


function AboutView() {
    var data = {};
    data.aboutSiftr = ABOUT_SIFTR;
    data.username = model.displayName;
    data.loggedIn = controller.logged_in();

    var template = $('#aboutTemplate').html();
    var view = Mustache.render(template, data);

    this.html = $(view).get(0);

    //TODO: find a better way of getting around the fact that you have to wait until the element is rendered to attach an eventlistener
    var cookie = $.cookie('aris-auth');
    if (cookie) {
        self.playerId = cookie.user_id;
        self.displayName = cookie.username;
        self.readWriteKey = cookie.key;
    } else {
        $(this.html).find('.sifter-show-logout-button').hide();
    }

    $(this.html).find('.sifter-show-logout-button').on('click', function() {
        if (typeof FB != 'undefined') { //check this first or you'll get errors
            FB.getLoginStatus(function(response) { //check to see if they are currently logged in
                if (response.status === 'connected') {
                    FB.logout(function(response) {}); //which will run controller.logout when it's done
                } else {
                    $('.account-info').hide();
                    controller.logout(); //they are not currently logged in to facebook, so you can run the plain controller.logout
                }
            });
            $('.account-info').hide();

            controller.logout(); //TODO: hack to make sure logout happens until url sent to FB finalized
        } else {
            $('.account-info').hide();

            controller.logout(); //this deletes all the cookies
        }
    });

}

function FiltersView() {
    var data = {};
    data.categories = getTagListForRender();

    var template = $('#filtersTemplate').html();
    var view = Mustache.render(template, data);

    this.html = $(view).get(0);
}

function getTagListForRender() {
    var category_list = [];
    for (var i = 0; i < model.tags.length; i++) {
        category_list.push({
            "category": model.tags[i].tag,
            "category_number": i + 1,
            "note_count": model.tags[i].count,
        });
    }

    return category_list;
}

function clickLogout() {
    $('.sifter-show-logout-button').click();
}
