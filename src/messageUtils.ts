export const SPOTIFY_LINK_START = 'https://open.spotify.com/track/';

export const getTrackIdFromLink = (link: string): string | null => {
  try {
    const startOfId = SPOTIFY_LINK_START.length;
    const endOfId = link.indexOf('?');
    if (startOfId > 0 && endOfId > 0) {
      return link.substring(startOfId, endOfId);
    } else if (startOfId > 0 && endOfId === -1) {
      return link.substring(startOfId);
    } else {
      // noinspection ExceptionCaughtLocallyJS
      throw Error('No track ID found in URL');
    }
  } catch (e) {
    console.error(`Unable to parse trackId ${e}`);
  }
  return null;
};

export const getArtistName = (message: string): string | null => {
  try {
    const startOfName = 0;
    var endOfName = 0;
      if(message.indexOf(' - ') != -1){
        endOfName = message.indexOf(' - ');
      } else endOfName = message.indexOf('-');
    if (endOfName > 0) {
      return message.substring(startOfName, endOfName);
    } else if (endOfName === -1) {
      return message.substring(startOfName);
    } else {
      // noinspection ExceptionCaughtLocallyJS
      throw Error('Artist not found');
    }
  } catch (e) {
    console.error(`Unable to parse artistName ${e}`);
  }
  return null;
};

export const getSongName = (message: string): string | null => {
  try {
    var startOfName = 0;
    if (message.indexOf(' - ') != -1){
      startOfName = message.indexOf(' - ' ) + 3;
    } else startOfName = message.indexOf('-') + 1;
    const endOfName = message.length;
    if (startOfName > 0 && endOfName > 0) {
      return message.substring(startOfName, endOfName);
    } else if (startOfName > 0 && endOfName === -1) {
      return message.substring(startOfName);
    } else {
      // noinspection ExceptionCaughtLocallyJS
      throw Error('Song not found');
    }
  } catch (e) {
    console.error(`Unable to parse song ${e}`);
  }
  return null;
};
