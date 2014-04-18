<?php
// donne la liste des candidats au conseil
include ("parametres.php");
include ("normalize.php");
include ("comex_library.php");
//include("../common/library/fonctions_php.php");

$meta = '<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <title>Complex Systems Scholars</title>
        <meta name="description" content="">
        <meta name="author" content="">
        <!-- Le HTML5 shim, for IE6-8 support of HTML elements -->
        <!--[if lt IE 9]>
		<script src="http://html5shim.googlecode.com/svn/trunk/html5.js"></script>
		<![endif]-->
        <!-- Le styles -->
        <link href="css/bootstrap_iscpif.css" rel="stylesheet">
        <link type="text/css" href="css/brownian-motion/jquery-ui-1.8.16.custom.css">
        <link href="http://fonts.googleapis.com/css?family=Ubuntu" rel="stylesheet" type="text/css">
        <script type="text/javascript" src="js/jquery/jquery-1.7.min.js"></script>
        <script type="text/javascript" src="js/jquery-ui/jquery-ui-1.8.16.custom.min.js"></script>
        <script type="text/javascript" src="js/bootstrap/bootstrap-dropdown-fade.js"></script>
        <script type="text/javascript" src="js/misc/underscore.min.js"></script>
        <script type="text/javascript" src="js/jquery/jquery.highlight-3.js"></script>
        <script type="text/javascript" src="js/misc/json2.js"></script>
        <script type="text/javascript" src="js/utils.js"></script>
        <script type="text/javascript" src="Highcharts-2.2.0/js/highcharts.js"></script>
        <script type="text/javascript" src="Highcharts-2.2.0/js/modules/exporting.js"></script>

        <script type="text/javascript" src="http://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js"></script>

        <link href="css/whoswho.css" rel="stylesheet" type="text/css">
        <link rel="shortcut icon" href="images/favicon.ico">
        <link rel="apple-touch-icon" href="images/apple-touch-icon.png">
        <link rel="apple-touch-icon" sizes="72x72" href="images/apple-touch-icon-72x72.png">
        <link rel="apple-touch-icon" sizes="114x114" href="images/apple-touch-icon-114x114.png">
          	<script type="text/javascript">
		  var _gaq = _gaq || [];
		  _gaq.push([\'_setAccount\', \'UA-30062222-1\']);
		  _gaq.push([\'_setDomainName\', \'communityexplorer.org\']);
		  _gaq.push([\'_trackPageview\']);

		  (function() {
		    var ga = document.createElement(\'script\'); ga.type = \'text/javascript\'; ga.async = true;
		    ga.src = (\'https:\' == document.location.protocol ? \'https://ssl\' : \'http://www\') + \'.google-analytics.com/ga.js\';
		    var s = document.getElementsByTagName(\'script\')[0]; s.parentNode.insertBefore(ga, s);
		  })();
		</script>
            ';

define('_is_utf8_split', 5000);

function is_utf8($string) {
   
    // From http://w3.org/International/questions/qa-forms-utf-8.html
    return preg_match('%^(?:
          [\x09\x0A\x0D\x20-\x7E]            # ASCII
        | [\xC2-\xDF][\x80-\xBF]             # non-overlong 2-byte
        |  \xE0[\xA0-\xBF][\x80-\xBF]        # excluding overlongs
        | [\xE1-\xEC\xEE\xEF][\x80-\xBF]{2}  # straight 3-byte
        |  \xED[\x80-\x9F][\x80-\xBF]        # excluding surrogates
        |  \xF0[\x90-\xBF][\x80-\xBF]{2}     # planes 1-3
        | [\xF1-\xF3][\x80-\xBF]{3}          # planes 4-15
        |  \xF4[\x80-\x8F][\x80-\xBF]{2}     # plane 16
    )*$%xs', $string);
   
}

$data = json_decode($_GET['query']);

function objectToArray($d) {
		if (is_object($d)) {
			// Gets the properties of the given object
			// with get_object_vars function
			$d = get_object_vars($d);
		}
 
		if (is_array($d)) {
			/*
			* Return array converted to object
			* Using __FUNCTION__ (Magic constant)
			* for recursive call
			*/
			return array_map(__FUNCTION__, $d);
		}
		else {
			// Return array
			return $d;
		}
	}


$base = new PDO("sqlite:" . $dbname);

// on récupère les profession of faith
$electionsdb= new PDO("sqlite:councilors2012.sqlite");
$candidates=array();
$sql = "SELECT * FROM candidates";
$last_name=array();
foreach ($electionsdb->query($sql) as $row) {
    $info = array();
    $info['first_name'] = $row['first_name'];
    $info['last_name'] = $row['last_name'];
    $info['login'] = $row['login'];
    $last_name[] = $row['last_name'];
    $info['profession_faith'] = $row['profession_faith'];
    $candidates[]=$info;
}

$termsMatrix = array(); // liste des termes présents chez les scholars avec leurs cooc avec les autres termes
$scholarsMatrix = array(); // liste des scholars avec leurs cooc avec les autres termes
$scholarsIncluded = 0;


$imsize = 150;

$content='';
        
//echo $sql.'<br/>';

natsort($last_name);
// liste des chercheurs
$scholars = array();
foreach ($last_name as $key => $value) {
        
$sql = "SELECT * FROM scholars where login='".$candidates[$key]['login']."'";    

//$query = "SELECT * FROM scholars";
foreach ($base->query($sql) as $row) {
    $info = array();
    $info['profession_faith'] = $candidates[$key]['profession_faith'];
    $info['unique_id'] = $row['unique_id'];
    $info['first_name'] = $row['first_name'];
    $info['initials'] = $row['initials'];
    $info['last_name'] = $row['last_name'];
    $info['nb_keywords'] = $row['nb_keywords'];
    $info['css_voter'] = $row['css_voter'];
    $info['css_member'] = $row['css_member'];
    $info['keywords_ids'] = explode(',', $row['keywords_ids']);
    $info['keywords'] = $row['keywords'];
    $info['status'] = $row['status'];
    $info['country'] = $row['country'];
    $info['homepage'] = $row['homepage'];
    $info['lab'] = $row['lab'];
    $info['affiliation'] = $row['affiliation'];
    $info['lab2'] = $row['lab2'];
    $info['affiliation2'] = $row['affiliation2'];
    $info['homepage'] = $row['homepage'];
    $info['title'] = $row['title'];
    $info['position'] = $row['position'];
    $info['photo_url'] = $row['photo_url'];
    $info['interests'] = $row['interests'];
    $info['address'] = $row['address'];
    $info['city'] = $row['city'];
    $info['postal_code'] = $row['postal_code'];
    $info['phone'] = $row['phone'];
    $info['mobile'] = $row['mobile'];
    $info['fax'] = $row['fax'];
    $info['affiliation_acronym'] = $row['affiliation_acronym'];
    $scholars[$row['unique_id']] = $info;
}
}

/// stats
//$base = new PDO('sqlite:' . $dbname);
include ('stat-prep_from_array.php');///



include ("elections_results.php");

// liste des chercheurs



//$content .= '<center><a href="http://main.csregistry.org/vote.php"><img src=http://main.csregistry.org/tiki-download_file.php?fileId=26 target="blank"></a></center></div>
$content .= '</div>
    
';
$content .= '</div>
            <footer>
                GENERATED BY <a href="http://iscpif.fr"><img src="css/branding/logo-iscpif_medium.png" alt="iscpif.fr" style="border: none; margin-bottom : -6px;" title="isc-pif" /></a>-  <a href="http://sciencemapping.com" target="_BLANK">MOMA</a> - <a href="http://www.crea.polytechnique.fr/LeCREA/" target="_BLANK">CREA</a> - <a href="http://www.cnrs.fr/fr/recherche/index.htm" target="_BLANK">CNRS</a> 
            </footer>
        </div>
</body>
</html>';

//////// Header
$header = '<div class="row" id="welcome">
    <div class="span12" align="justify">

<h2><a href="http://main.csregistry.org/tiki-index.php?page=CSSElections"><img src="http://main.csregistry.org/tiki-download_file.php?fileId=20" align="center"></a>
<br/>
Results of the ballot - August 6 2012</h2>
<p>
19 scholars have been elected as council members of the <a href="http://cssociety.org" target="blank">Complex Systems
Society</a> (CSS). Their mandate will run from Sept. 3 2012 until 8 days before ECCS\'14.<br/>

<center>
<h2>New Councillors 2012 ! </h2><br/>
'.$images.'
<h2>Welcome to them ! </h2>
</center>
<br/>
<br/>
<p>
These new councillors belong to <a href="#labs">'
.  count($labs).' labs</a> and <a href="#orga">'.$orga_count.' organizations</a>. Statitics about the candidates are
available <a href="#stats">below</a>. The raw results of the vote are available <a href="http://css.csregistry.org/tiki-index.php?page=Elections2012" target="blank">here</a><br/>
    <br/>
    
</p>';
//<center><a href="http://main.csregistry.org/vote.php"  target="blank"><img src=http://main.csregistry.org/tiki-download_file.php?fileId=26></a></center>

$header .='
    
</p>


<br/>
<br/> <A NAME="scholars"> </A>
<h2>New councilors 2012 by alphabetical order</h2>
<br/>
<br/>
</div>
</div>';

echo $meta.' '.$stats.'</head>';
echo $header;
echo $content;



?>