export interface DownloadPort {
  create(blob: Blob): string;
  revoke(url: string): void;
  save(url: string, filename: string): void;
}
const browserPort: DownloadPort = {
  create: (blob) => URL.createObjectURL(blob),
  revoke: (url) => URL.revokeObjectURL(url),
  save: (url, filename) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.hidden = true;
    document.body.append(link);
    try {
      link.click();
    } finally {
      link.remove();
    }
  },
};
/** One owned URL and timer; already saved files are outside the workspace lifecycle. */
export class ReportDownload {
  private url: string | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;
  constructor(private readonly port: DownloadPort = browserPort) {}
  save(json: string, filename: string) {
    this.clear();
    this.url = this.port.create(new Blob([json], { type: "application/json" }));
    try {
      this.port.save(this.url, filename);
      this.timer = setTimeout(() => this.clear(), 1500);
    } catch (error) {
      this.clear();
      throw error;
    }
  }
  clear() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    if (this.url) this.port.revoke(this.url);
    this.url = undefined;
  }
}
