using System.Collections.Generic;
using NzbDrone.Core.Messaging.Commands;

namespace NzbDrone.Core.MediaFiles.MovieImport.Manual
{
    public class ManualImportCommand : Command
    {
        public List<ManualImportFile> Files { get; set; }

        public override bool SendUpdatesToClient => true;

        // ManualImport should not be gated by the disk-access lock.
        // It reads from existing download paths and must not be starved
        // behind hundreds of search commands when another disk-access
        // command (ProcessMonitoredDownloads) is running.
        public override bool RequiresDiskAccess => false;

        public ImportMode ImportMode { get; set; }
    }
}
