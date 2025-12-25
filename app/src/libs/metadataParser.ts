import type Metadata from "#types/Metadata";

const splitters = [" - ", ": ", " – ", " — ", " ― ", " ~ ", " ～ ", " ∼ ", " — ", " ─ "];

const artistSplitters = [
  " & ",
  " x ",
  ", ",
  " / ",
  " + ",
  " feat. ",
  " featuring ",
  " ft. ",
  " vs. ",
  " vs ",
  " v ",
  " w/ ",
  " w/",
];

const titleIndicators = [" ft ", " feat ", " featuring ", " w/ "];

const bracketsOpeners = ["(", "[", "{", "<", "【", "『", "「", "《", "（", "<"];
const bracketsClosers = [")", "]", "}", ">", "】", "』", "」", "》", "）", ">"];

function coreSplitter(stringArray: Array<string>, stringSplitter: string) {
  const splittedStrings = [];
  for (const _string of stringArray) {
    splittedStrings.push(..._string.split(new RegExp(`(?<=\\S)${stringSplitter}(?=\\S)`, "i")));
  }
  return splittedStrings;
}

function splitText(string: string, splitters: Array<string>) {
  let splittedString = [string];
  for (const _splitter of splitters) {
    const tmpSplittedString = [];
    for (const _coreSplitted of coreSplitter(splittedString, _splitter)) {
      tmpSplittedString.push(_coreSplitted);
    }

    splittedString = tmpSplittedString;
  }

  return splittedString;
}

export function parseMetadata(metadata: Metadata) {
  let { title, artist } = metadata.info;

  const splitter = splitters.find((_splitter) => {
    let bracketDepth = 0;
    for (let i = 0; i < title.length; i++) {
      if (bracketsOpeners.includes(title[i])) {
        bracketDepth++;
      } else if (bracketsClosers.includes(title[i])) {
        bracketDepth--;
      }

      if (bracketDepth === 0 && title.slice(i, i + _splitter.length) === _splitter) {
        return true;
      }
    }
    return false;
  });

  [artist, title] = splitter ? title.split(splitter) : [artist, title];

  const modifiedArtist: Array<string> = [];
  const artists = [...new Set(splitText(artist, artistSplitters))].sort();

  for (const indicator of titleIndicators) {
    const indicatorIndex = title.toLowerCase().indexOf(indicator);
    if (indicatorIndex !== -1) {
      let afterIndicator = title.slice(indicatorIndex + indicator.length);
      const hasDot = afterIndicator.trim().startsWith(".");
      afterIndicator = afterIndicator.trim().slice(hasDot ? 1 : 0);

      let additionalArtists: Array<string> = [];
      let bracketDepth = 0;
      let artistEndIndex = afterIndicator.length;

      for (let i = 0; i < afterIndicator.length; i++) {
        if (bracketsOpeners.includes(afterIndicator[i])) {
          bracketDepth++;
        } else if (bracketsClosers.includes(afterIndicator[i])) {
          bracketDepth--;
          if (bracketDepth === 0) {
            artistEndIndex = i + 1;
            break;
          }
        } else if (bracketDepth === 0 && afterIndicator[i] === " ") {
          artistEndIndex = i;
          break;
        }
      }

      if (artistEndIndex > 0) {
        additionalArtists = splitText(afterIndicator.slice(0, artistEndIndex), titleIndicators).map((artist) => artist.trim());
      } else {
        additionalArtists = splitText(afterIndicator, titleIndicators).map((artist) => artist.trim());
      }

      additionalArtists = additionalArtists.map((artist) => {
        for (const opener of bracketsOpeners) {
          const openerIndex = artist.indexOf(opener);
          if (openerIndex !== -1) {
            artist = artist.slice(0, openerIndex).trim();
          }
        }
        for (const closer of bracketsClosers) {
          const closerIndex = artist.lastIndexOf(closer);
          if (closerIndex !== -1) {
            artist = artist.slice(0, closerIndex).trim();
          }
        }
        return artist;
      });

      let metadataStartIndex = -1;
      for (let i = indicatorIndex; i < title.length; i++) {
        if (bracketsOpeners.includes(title[i])) {
          metadataStartIndex = i;
          break;
        }
      }

      if (metadataStartIndex !== -1) {
        title = title.slice(0, indicatorIndex).trim() + " " + title.slice(metadataStartIndex).trim();
      } else {
        title = title.slice(0, indicatorIndex).trim();
      }

      for (let i = 0; i < bracketsOpeners.length; i++) {
        const opener = bracketsOpeners[i];
        const closer = bracketsClosers[i];
        let openerIndex = title.indexOf(opener);
        while (openerIndex !== -1) {
          const closerIndex = title.indexOf(closer, openerIndex);
          if (closerIndex === -1) {
            title = title.slice(0, openerIndex) + title.slice(openerIndex + 1);
            break;
          } else {
            openerIndex = title.indexOf(opener, closerIndex);
          }
        }
      }

      title = title.replace(/\s+/g, " ").trim();

      artists.push(...additionalArtists);
      break;
    }
  }

  const lowerCaseArtists = modifiedArtist.map((artist) => artist.toLowerCase());
  for (const artist of new Set(artists)) {
    const cleanedArtist = artist.replace(/^&\s*/, "").trim();
    if (!lowerCaseArtists.includes(cleanedArtist.toLowerCase())) {
      const existingIndex = modifiedArtist.findIndex(
        (existingArtist) => existingArtist.toLowerCase() === cleanedArtist.toLowerCase(),
      );
      if (existingIndex === -1) {
        modifiedArtist.push(cleanedArtist);
      }
    }
  }

  artist = modifiedArtist.join(", ") || artist;

  return {
    artist: artist.replace(/,,+/g, ",").replace(/,\s*$/, ""),
    title,
    thumbnail: metadata.info.artwork,
    favicon: metadata.favicon,
  };
}
