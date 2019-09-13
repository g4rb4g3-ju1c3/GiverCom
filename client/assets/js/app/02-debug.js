


var tp_index = 0;



function tp(message)
{
   console.log(typeof message !== "undefined" ? message : "tp");
}



function tpi(message)
{
   console.log(tp_index++ + ": " + (typeof message !== "undefined" ? message : "tpi"));
}



function tp_reset()
{
   tp_index = 0;
}



function tp_alert(message)
{
   alert(typeof message !== "undefined" ? message : "tp_alert");
}



