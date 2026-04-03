using NLog;
using NzbDrone.Core.Download;
using NzbDrone.Core.Parser.Model;
using NzbDrone.Core.Qualities;

namespace NzbDrone.Core.MediaFiles.MovieImport.Specifications
{
    public class QualityVerificationSpecification : IImportDecisionEngineSpecification
    {
        private readonly Logger _logger;

        public QualityVerificationSpecification(Logger logger)
        {
            _logger = logger;
        }

        public ImportSpecDecision IsSatisfiedBy(LocalMovie localMovie, DownloadClientItem downloadClientItem)
        {
            if (localMovie.MediaInfo == null)
            {
                _logger.Debug("MediaInfo unavailable, skipping resolution verification");
                return ImportSpecDecision.Accept();
            }

            if (localMovie.MediaInfo.Width == 0 || localMovie.MediaInfo.Height == 0)
            {
                _logger.Debug("Resolution not available in MediaInfo, skipping check");
                return ImportSpecDecision.Accept();
            }

            var claimedQuality = localMovie.Quality?.Quality;
            if (claimedQuality == null || claimedQuality == Quality.Unknown)
            {
                return ImportSpecDecision.Accept();
            }

            var actualWidth = localMovie.MediaInfo.Width;
            var claimedResolution = claimedQuality.Resolution;

            // No resolution claim to verify (e.g., SDTV, DVD)
            if (claimedResolution == 0)
            {
                return ImportSpecDecision.Accept();
            }

            // Map claimed resolution to minimum expected width
            // Allow 5% tolerance for slight encoding variations
            int minimumWidth;
            string resolutionLabel;

            if (claimedResolution >= 2160)
            {
                minimumWidth = 3640; // 3840 - 5%
                resolutionLabel = "4K/2160p";
            }
            else if (claimedResolution >= 1080)
            {
                minimumWidth = 1824; // 1920 - 5%
                resolutionLabel = "1080p";
            }
            else if (claimedResolution >= 720)
            {
                minimumWidth = 1216; // 1280 - 5%
                resolutionLabel = "720p";
            }
            else
            {
                // SD content — no strict width requirement
                return ImportSpecDecision.Accept();
            }

            if (actualWidth < minimumWidth)
            {
                _logger.Warn("Resolution mismatch: claimed {0} ({1}) but actual width is {2}px. Possible upscale or fake.",
                    claimedQuality.Name, resolutionLabel, actualWidth);

                return ImportSpecDecision.Reject(
                    ImportRejectionReason.ResolutionMismatch,
                    "Claimed {0} but actual resolution is {1}x{2} — does not meet minimum {3}px width for {4}",
                    claimedQuality.Name,
                    actualWidth,
                    localMovie.MediaInfo.Height,
                    minimumWidth,
                    resolutionLabel);
            }

            _logger.Debug("Resolution verified: claimed {0}, actual {1}x{2}", claimedQuality.Name, actualWidth, localMovie.MediaInfo.Height);
            return ImportSpecDecision.Accept();
        }
    }
}
