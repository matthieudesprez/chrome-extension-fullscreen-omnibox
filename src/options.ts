// function save_options() {
//     var color = $('#color').val();
//     var likesColor = $('#like').prop('checked');
//     chrome.storage.sync.set({
//         favoriteColor: color,
//         likesColor: likesColor
//     }, function () {
//         var status = $('#status');
//         status.text('Options saved.');
//         setTimeout(function () {
//             status.text('');
//         }, 750);
//     });
// }
//
// function restore_options() {
//     // Use default value color = 'red' and likesColor = true.
//     chrome.storage.sync.get({
//         favoriteColor: 'red',
//         likesColor: true
//     }, function (items: { favoriteColor, likesColor }) {
//         $('#color').val(items.favoriteColor);
//         $('#like').prop('checked', items.likesColor);
//     });
// }


