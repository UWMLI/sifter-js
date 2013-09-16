$(document).ready(function ()
{
  /* MOBILE */

  /* Initial state of Map/Image List and Toggle Button */
  $('.sifter-imagelist').addClass ("hidden-mobile");
  $('.switch-map'      ).addClass ("hidden-mobile");

  $('.switch-views').on('click', function()
  {
    $('.switch-view-icon').toggleClass ("hidden-mobile");
    $('.sifter-map'      ).toggleClass ("hidden-mobile");
    $('.sifter-imagelist').toggleClass ("hidden-mobile");
  });


  /* Filter slide up toggle */
  $('.sifter-filters-button').on('click', function()
  {
    $('.sifter-filters-slideout').toggleClass('sifter-filters-expanded');
  });



  /* DESKTOP */

  /* Initial state of Menu and Content */
  $('.sifter-filters-popdown').addClass('hidden-desktop');

  $('.sifter-menu-reveal').on('click', function()
  {
    $('.sifter-menu-reveal').toggleClass('button-active');
    $('.sifter-filters-popdown').toggleClass ('hidden-desktop');
    $('.sifter-content').toggleClass ('shrunk');
  });

});