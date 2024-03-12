// Screenshot Section
// =====================================================================================
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('captureBtn').addEventListener('click', captureScreenshot);
  });
  
  function captureScreenshot() {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, function(dataUrl) {
      // Convert dataUrl to Blob
      const blobData = dataURItoBlob(dataUrl);
      // Create a blob URL
      const blobUrl = URL.createObjectURL(blobData);
      // Create a link element
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = 'webview.png';
      // Simulate a click to trigger download
      a.click();
      // Clean up
      URL.revokeObjectURL(blobUrl);
    });
  }
  
  function dataURItoBlob(dataURI) {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  }
// =====================================================================================
// End of Screenshot Section

