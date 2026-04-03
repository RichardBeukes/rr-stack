using System.Collections.Generic;
using System.Linq;
using NLog;
using NzbDrone.Common.Extensions;
using NzbDrone.Core.Download;
using NzbDrone.Core.Languages;
using NzbDrone.Core.Parser;
using NzbDrone.Core.Parser.Model;

namespace NzbDrone.Core.MediaFiles.EpisodeImport.Specifications
{
    public class AudioLanguageSpecification : IImportDecisionEngineSpecification
    {
        private readonly Logger _logger;

        public AudioLanguageSpecification(Logger logger)
        {
            _logger = logger;
        }

        public ImportSpecDecision IsSatisfiedBy(LocalEpisode localEpisode, DownloadClientItem downloadClientItem)
        {
            if (localEpisode.MediaInfo == null)
            {
                _logger.Debug("MediaInfo unavailable, skipping audio language check");
                return ImportSpecDecision.Accept();
            }

            if (localEpisode.MediaInfo.AudioLanguages == null || !localEpisode.MediaInfo.AudioLanguages.Any())
            {
                _logger.Debug("No audio language info available, skipping check");
                return ImportSpecDecision.Accept();
            }

            // Use the series original language as the expected language
            var series = localEpisode.Series;
            if (series?.OriginalLanguage == null || series.OriginalLanguage == Language.Unknown)
            {
                _logger.Debug("Series has no original language set, skipping audio language check");
                return ImportSpecDecision.Accept();
            }

            var wantedLanguage = series.OriginalLanguage;

            // Map wanted language to ISO-639 codes for comparison with ffprobe output
            var wantedIso = IsoLanguages.Find(wantedLanguage);
            if (wantedIso == null)
            {
                _logger.Debug("Could not find ISO code for wanted language {0}, skipping check", wantedLanguage);
                return ImportSpecDecision.Accept();
            }

            var wantedCodes = new HashSet<string>(System.StringComparer.OrdinalIgnoreCase);
            if (wantedIso.TwoLetterCode.IsNotNullOrWhiteSpace())
            {
                wantedCodes.Add(wantedIso.TwoLetterCode);
            }

            if (wantedIso.ThreeLetterCode.IsNotNullOrWhiteSpace())
            {
                wantedCodes.Add(wantedIso.ThreeLetterCode);
            }

            if (wantedIso.EnglishName.IsNotNullOrWhiteSpace())
            {
                wantedCodes.Add(wantedIso.EnglishName);
            }

            // Check if any audio track matches the wanted language
            var hasWantedLanguage = localEpisode.MediaInfo.AudioLanguages
                .Any(audioLang => audioLang.IsNotNullOrWhiteSpace() &&
                                  wantedCodes.Any(code => audioLang.Contains(code, System.StringComparison.OrdinalIgnoreCase)));

            if (hasWantedLanguage)
            {
                _logger.Debug("Found {0} audio track in file", wantedLanguage.Name);
                return ImportSpecDecision.Accept();
            }

            // Check for undefined/unknown audio language — these might still be valid
            var hasUndefinedOnly = localEpisode.MediaInfo.AudioLanguages
                .All(lang => lang.IsNullOrWhiteSpace() || lang.Equals("und", System.StringComparison.OrdinalIgnoreCase));

            if (hasUndefinedOnly)
            {
                _logger.Debug("All audio tracks have undefined language, allowing import");
                return ImportSpecDecision.Accept();
            }

            var actualLanguages = string.Join(", ", localEpisode.MediaInfo.AudioLanguages);
            _logger.Warn("File has audio tracks [{0}] but no {1} audio found. Potential wrong-language release.",
                actualLanguages, wantedLanguage.Name);

            return ImportSpecDecision.Reject(
                ImportRejectionReason.AudioLanguageMismatch,
                "No {0} audio track found. Audio tracks: [{1}]",
                wantedLanguage.Name,
                actualLanguages);
        }
    }
}
