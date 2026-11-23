/**
 * Đọc văn bản thuần từ file giảng viên tải lên (.txt, .md, .docx) ngay trên trình duyệt,
 * không cần thư viện ngoài: .docx là file zip, đọc word/document.xml bằng DecompressionStream.
 */

export const ACCEPTED_DOCUMENT_TYPES = '.txt,.md,.docx,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Trình duyệt chưa hỗ trợ đọc file .docx. Hãy dán nội dung hoặc dùng file .txt.');
  }
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Tìm và giải nén một entry trong file zip theo tên. */
async function readZipEntry(buffer: ArrayBuffer, entryName: string): Promise<Uint8Array | null> {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  // End of central directory nằm trong 64 KB cuối file.
  let eocd = -1;
  for (let offset = buffer.byteLength - 22; offset >= Math.max(0, buffer.byteLength - 65_557); offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) { eocd = offset; break; }
  }
  if (eocd < 0) return null;
  const entryCount = view.getUint16(eocd + 10, true);
  let pointer = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();

  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(pointer, true) !== 0x02014b50) return null;
    const method = view.getUint16(pointer + 10, true);
    const compressedSize = view.getUint32(pointer + 20, true);
    const nameLength = view.getUint16(pointer + 28, true);
    const extraLength = view.getUint16(pointer + 30, true);
    const commentLength = view.getUint16(pointer + 32, true);
    const localOffset = view.getUint32(pointer + 42, true);
    const name = decoder.decode(bytes.subarray(pointer + 46, pointer + 46 + nameLength));
    if (name === entryName) {
      const localNameLength = view.getUint16(localOffset + 26, true);
      const localExtraLength = view.getUint16(localOffset + 28, true);
      const start = localOffset + 30 + localNameLength + localExtraLength;
      const data = bytes.subarray(start, start + compressedSize);
      if (method === 0) return data;
      if (method === 8) return inflateRaw(data);
      return null;
    }
    pointer += 46 + nameLength + extraLength + commentLength;
  }
  return null;
}

function docxXmlToText(xml: string): string {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const paragraphs = Array.from(doc.getElementsByTagName('w:p'));
  return paragraphs.map((paragraph) => {
    let text = '';
    for (const node of Array.from(paragraph.getElementsByTagName('*'))) {
      if (node.tagName === 'w:t') text += node.textContent ?? '';
      else if (node.tagName === 'w:tab') text += '\t';
      else if (node.tagName === 'w:br') text += '\n';
    }
    return text;
  }).join('\n');
}

export async function readDocumentText(file: File): Promise<string> {
  if (file.size > MAX_DOCUMENT_BYTES) throw new Error('File không được vượt quá 5 MB.');
  const name = file.name.toLowerCase();
  if (name.endsWith('.txt') || name.endsWith('.md') || file.type.startsWith('text/')) {
    return (await file.text()).trim();
  }
  if (name.endsWith('.docx')) {
    const xml = await readZipEntry(await file.arrayBuffer(), 'word/document.xml');
    if (!xml) throw new Error('Không đọc được nội dung file .docx.');
    return docxXmlToText(new TextDecoder().decode(xml)).trim();
  }
  if (name.endsWith('.doc') || name.endsWith('.pdf')) {
    throw new Error('Chưa hỗ trợ .doc/.pdf. Hãy lưu lại dưới dạng .docx hoặc dán nội dung vào ô soạn thảo.');
  }
  throw new Error('Chỉ hỗ trợ file .docx, .txt hoặc .md.');
}
