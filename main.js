// YouTube Video ID nikalne ka function
function extractVideoId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// HTML Entities (jaise &amp;, &#39;) ko saaf karne ka function
function decodeHTMLEntities(text) {
    const textArea = document.createElement('textarea');
    textArea.innerHTML = text;
    return textArea.value;
}

// Main function jo transcript nikalega
async function fetchTranscript() {
    const urlInput = document.getElementById('videoUrl').value.trim();
    const statusDiv = document.getElementById('status');
    const resultContainer = document.getElementById('resultContainer');
    const transcriptBox = document.getElementById('transcriptBox');

    if (!urlInput) {
        alert("Please enter a valid YouTube URL first!");
        return;
    }

    const videoId = extractVideoId(urlInput);
    if (!videoId) {
        alert("Invalid YouTube Link! Sahi link daalein.");
        return;
    }

    // UI Updates (Loading State)
    statusDiv.innerText = "⏳ YouTube se data fetch kiya jaa raha hai...";
    statusDiv.classList.remove('hidden');
    resultContainer.classList.add('hidden');

    try {
        // Step 1: YouTube page ka HTML lana (via AllOrigins CORS Proxy)
        const targetUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
        
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error("Network response thik nahi tha.");
        
        const data = await response.json();
        const html = data.contents;

        // Step 2: HTML ke andar se 'ytInitialPlayerResponse' JSON data nikalna
        const startIdx = html.indexOf('ytInitialPlayerResponse = ');
        if (startIdx === -1) throw new Error("Video ka data nahi mil paya. Kya video public hai?");
        
        const remainingHtml = html.substring(startIdx + 'ytInitialPlayerResponse = '.length);
        
        // Bracket counting se exact JSON object nikalna
        let bracketCount = 0;
        let jsonStr = '';
        for (let i = 0; i < remainingHtml.length; i++) {
            const char = remainingHtml[i];
            if (char === '{') bracketCount++;
            if (char === '}') bracketCount--;
            jsonStr += char;
            if (bracketCount === 0 && jsonStr.length > 1) break;
        }

        const playerResponse = JSON.parse(jsonStr);
        
        // Step 3: Caption tracks (subtitles) ka URL dundhna
        const captionTracks = playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        
        if (!captionTracks || captionTracks.length === 0) {
            throw new Error("Is video mein koi Subtitles/Transcript available nahi hai.");
        }

        // Pehla available language track uthana (usually English/Hindi auto-generated)
        const captionUrl = captionTracks[0].baseUrl;
        
        // Step 4: XML Transcript data download karna (via Proxy)
        statusDiv.innerText = "📝 Text convert kiya jaa raha hai...";
        const captionProxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(captionUrl)}`;
        const captionResponse = await fetch(captionProxyUrl);
        const captionData = await captionResponse.json();
        const xmlText = captionData.contents;

        // Step 5: XML code ko plain text mein badalna
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        const textElements = xmlDoc.getElementsByTagName("text");
        
        let fullTranscript = "";
        for (let i = 0; i < textElements.length; i++) {
            fullTranscript += textElements[i].textContent + " ";
        }

        // Final Clean up aur Output dikhana
        if (!fullTranscript.trim()) throw new Error("Transcript khali mili.");
        
        transcriptBox.value = decodeHTMLEntities(fullTranscript.trim());
        statusDiv.classList.add('hidden');
        resultContainer.classList.remove('hidden');

    } catch (error) {
        alert("Error: " + error.message);
        statusDiv.classList.add('hidden');
    }
}

// Copy button functionality
function copyToClipboard() {
    const transcriptBox = document.getElementById('transcriptBox');
    transcriptBox.select();
    document.execCommand('copy');
    alert("Transcript copied to clipboard! 🎉");
}
