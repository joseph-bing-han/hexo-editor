/*
 * Author: tajpure
 * Since: 2016-05-08
 */

var editor = null;
var socket = null;

function back() {
  location.href = '/';
}

function loading() {
    $('#done').css('display', 'none');
    $('#loading').css('display', 'block');
}

function done() {
    $('#done').css('display', 'block');
    $('#loading').css('display', 'none');
}

function closeDialog() {
  $('#shadow-mask').css('display', 'none');
  $('#image-upload-dialog').css('display', 'none');
}

function uploadImage() {
  $('#shadow-mask').css('display', 'block');
  $('#image-upload-dialog').css('display', 'block');
  var fileInputTextDiv = $('#file_input_text_div');
  var fileInput = $('#file_input');
  var fileInputText = $('#file_input_text');
  fileInput.change(changeInputText);
  fileInput.change(changeState);
  function changeInputText() {
    var str = fileInput.val();
    var i;
    if (str.lastIndexOf('\\')) {
      i = str.lastIndexOf('\\') + 1;
    } else if (str.lastIndexOf('/')) {
      i = str.lastIndexOf('/') + 1;
    }
    fileInputText.val(str.slice(i, str.length));
  }
  function changeState() {
    if (fileInputText.val().length != 0) {
      if (!fileInputTextDiv.hasClass("is-focused")) {
        fileInputTextDiv.addClass('is-focused');
      }
    } else {
      if (fileInputTextDiv.hasClass("is-focused")) {
        fileInputTextDiv.removeClass('is-focused');
      }
    }
  }
};

function afterEditorPage(key) {
  editor = ace.edit("editor");
  editor.getSession().setUseWrapMode(true);
  editor.$blockScrolling = Infinity;
  sync(key);
};

function sync(key) {
  if (!socket) {
    socket = io();
  }
  if (key) {
    $.get('cache?id=' + key, function(article) {
      if (!article.date) {
        $('#date').val(new Date().format('yyyy-mm-dd HH:MM:ss'));
      } else {
        $('#date').val(article.date);
      }
      $('#date').parent().addClass('is-dirty');
      $('#title').val(article.title);
      $('#tags').val(article.tags);
      $('#categories').val(article.categories);
      editor.setValue(article.content, 1);
    });
  } else {
    socket.on('init', function (article) {
      if (!article.date) {
        $('#date').val(new Date().format('yyyy-mm-dd HH:MM:ss'));
      } else {
        $('#date').val(article.date);
      }
      $('#date').parent().addClass('is-dirty');
      $('#title').val(article.title);
      $('#tags').val(article.tags);
      $('#categories').val(article.categories);
      editor.setValue(article.content, 1);
    });
  }
  $("#title").on("change paste keyup", function() {
    loading();
    var title = $('#title').val();
    var date = $('#date').val();
    var tags = $('#tags').val();
    var categories = $('#categories').val();
    var syncData = TextSync.sync(editor.getValue());
    var article = {'title': title, 'date': date, 'tags': tags,
                  'categories': categories, 'data': syncData, 'key': key};
    socket.emit('syncText', article);
    socket.on('syncEnd', function (data) {
      done();
    });
  });
  editor.on('change', function(e) {
    loading();
    var title = $('#title').val();
    var date = $('#date').val();
    var tags = $('#tags').val();
    var categories = $('#categories').val();
    var syncData = TextSync.sync(editor.getValue());
    var article = {'title': title, 'date': date, 'tags': tags,
                  'categories': categories, 'data': syncData, 'key': key};
    socket.emit('syncText', article);
    socket.on('syncEnd', function (data) {
      done();
    });
  });
};

function insertImage() {
  var fileInput = $('#file_input')[0].files[0];
  if (fileInput) {
    var formData = new FormData();
    formData.append('file', fileInput);
    $.ajax({
      type: "POST",
      url: '/editor/image',
      data: formData,
      success: function(data) {
        editor.insert('\n![](' + data + ')');
        closeDialog();
      },
      cache: false,
      contentType: false,
      processData: false
    });
    $('#file_input').val(null);
    $('#file_input_text').val(null);
  } else {
    alert('Please add image!');
  }
}

function insertLink() {
  editor.insert('[]()');
};

function formatBlod() {
  var range = editor.selection.getRange();
  var blodText = '**' + editor.getSelectedText() + '**';
  editor.session.replace(range, blodText);
};

function formatItalic() {
  var range = editor.selection.getRange();
  var italicText = '*' + editor.getSelectedText() + '*';
  editor.session.replace(range, italicText);
};

function formatListNumbered() {
  var range = editor.selection.getRange();
  var formatText = editor.getSelectedText();
  var rows = formatText.split('\n');
  formatText = '';
  for (var i = 1; i <= rows.length; i++) {
    formatText += i + '. ' + rows[i-1] + '\n';
  }
  editor.session.replace(range, formatText);
};

function formatListBulleted() {
  var range = editor.selection.getRange();
  var formatText = editor.getSelectedText();
  var rows = formatText.split('\n');
  formatText = '';
  for (var i = 1; i <= rows.length; i++) {
    formatText += '* ' + rows[i-1] + '\n';
  }
  editor.session.replace(range, formatText);
};

function formatQuote() {
  var range = editor.selection.getRange();
  var formatText = editor.getSelectedText();
  var rows = formatText.split('\n');
  formatText = '';
  for (var i = 1; i <= rows.length; i++) {
    formatText += '> ' + rows[i-1] + '\n';
  }
  editor.session.replace(range, formatText);
};

function formatCode() {
  var range = editor.selection.getRange();
  var italicText = '\n```\n' + editor.getSelectedText() + '\n```';
  editor.session.replace(range, italicText);
};

function redo() {
  editor.session.getUndoManager().redo(true);
};

function undo() {
  editor.session.getUndoManager().undo(true);
};

function preview() {
  if ($('#editor').css('display') === 'block') {
    var data = marked(editor.getValue());
    $('#preview').html(data);
    $('#preview').find('pre').each(function(i, e) {
      hljs.highlightBlock(e);
    });
    $('#editor').hide();
    $('#preview').show();
    $('#visibility').text('visibility_off');
  } else {
    $('#editor').show();
    $('#preview').hide();
    $('#visibility').text('visibility');
  }
}

function publish() {
  var title = $('#title').val();
  var content = editor.getValue();
  var date = $('#date').val();
  var tags = $('#tags').val();
  var key = $('#key').val();
  var categories = $('#categories').val();
  var syncData = TextSync.sync(editor.getValue());
  if (!date) {
    date = (new Date()).format('yyyy-mm-dd HH:MM:ss');
  }
  var article = {'title': title, 'date': date, 'tags': tags,
                 'categories': categories, 'content': content, 'key': key};
  socket.emit('publish', article);
  socket.on('publishEnd', function(e) {
    loading();
    location.href = '/';
  });
}
