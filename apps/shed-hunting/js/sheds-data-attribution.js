/**
 * Sheds — restrained data-source credits for displayed third-party facts.
 *
 * Open-Meteo weather/elevation display requires CC BY attribution.
 * Elevation-derived Inspect/Search Area facts also credit Copernicus (per
 * Open-Meteo Elevation API docs). Pike RADAR pack terrain is USGS 3DEP —
 * keep those sources separate.
 *
 * Does not assert commercial/non-commercial clearance for free-endpoint use.
 */
(function (global) {
  "use strict";

  var OPEN_METEO_URL = "https://open-meteo.com/";
  var OPEN_METEO_LICENCE_URL = "https://open-meteo.com/en/licence";
  var CC_BY_URL = "https://creativecommons.org/licenses/by/4.0/";
  /** Copernicus DEM citation destination cited by Open-Meteo Elevation API docs. */
  var COPERNICUS_DEM_DOI = "https://doi.org/10.5270/ESA-c5d3d65";
  var COPERNICUS_PROGRAM_URL = "https://www.copernicus.eu/";

  var EXT_REL = 'rel="noopener noreferrer"';

  function link(href, label) {
    return (
      '<a href="' +
      href +
      '" target="_blank" ' +
      EXT_REL +
      ">" +
      label +
      "</a>"
    );
  }

  /** Official Open-Meteo licence example wording + licence link. */
  function weatherCreditHtml() {
    return (
      link(OPEN_METEO_URL, "Weather data by Open-Meteo.com") +
      " · " +
      link(CC_BY_URL, "CC BY 4.0") +
      " · " +
      link(OPEN_METEO_LICENCE_URL, "licence")
    );
  }

  /**
   * When Open-Meteo elevation-derived facts are shown (Search Areas / Inspect).
   * Not used for Pike RADAR pack terrain.
   */
  function elevationCreditHtml() {
    return (
      "Elevation sample via " +
      link(OPEN_METEO_URL, "Open-Meteo") +
      " · " +
      link(COPERNICUS_PROGRAM_URL, "Copernicus") +
      " DEM (" +
      link(COPERNICUS_DEM_DOI, "GLO-90") +
      ")"
    );
  }

  /** Local GIS pack landscape / RADAR terrain (not live elevation). */
  function radarPackCreditHtml() {
    return "Landscape terrain: USGS 3DEP–derived local GIS pack (not live elevation)";
  }

  function weatherAndPackCreditHtml() {
    return weatherCreditHtml() + "<br>" + radarPackCreditHtml();
  }

  function setCredit(el, html, visible) {
    if (!el) return;
    if (!visible) {
      el.hidden = true;
      el.innerHTML = "";
      return;
    }
    el.hidden = false;
    el.innerHTML = html;
  }

  global.WaypointShedsDataAttribution = {
    OPEN_METEO_URL: OPEN_METEO_URL,
    OPEN_METEO_LICENCE_URL: OPEN_METEO_LICENCE_URL,
    CC_BY_URL: CC_BY_URL,
    COPERNICUS_DEM_DOI: COPERNICUS_DEM_DOI,
    COPERNICUS_PROGRAM_URL: COPERNICUS_PROGRAM_URL,
    weatherCreditHtml: weatherCreditHtml,
    elevationCreditHtml: elevationCreditHtml,
    radarPackCreditHtml: radarPackCreditHtml,
    weatherAndPackCreditHtml: weatherAndPackCreditHtml,
    setCredit: setCredit
  };
})(typeof window !== "undefined" ? window : globalThis);
