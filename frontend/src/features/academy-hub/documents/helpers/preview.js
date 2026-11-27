import { renderAsync } from "docx-preview";
import JSZip from "jszip";
import * as XLSX from "xlsx";

/**
 * Các bộ đọc/parse định dạng Office tách khỏi Documents.jsx.
 * Mỗi hàm nhận Blob từ BE và trả về dữ liệu thuần (hoặc render vào container),
 * để component chính chỉ còn phần điều phối state.
 */

const MAX_SHEET_ROWS = 200;

/** Render file .docx vào container bằng docx-preview. */
export const renderDocxBlob = (blob, container) => {
    if (!container) return;
    container.innerHTML = "";
    renderAsync(blob, container, undefined, {
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        experimental: true,
        useBase64URL: true,
    });
};

/** Đọc .xls/.xlsx/.csv -> [{ name, rows }] (giới hạn số dòng để nhẹ DOM). */
export const parseSpreadsheet = async (blob) => {
    const buffer = await blob.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheets = workbook.SheetNames.map((name) => {
        const sheet = workbook.Sheets[name];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        return { name, rows: rows.slice(0, MAX_SHEET_ROWS) };
    });
    if (!sheets.length) throw new Error("Bảng tính không có dữ liệu.");
    return sheets;
};

/** Đọc .pptx -> [{ number, text: string[] }] theo đúng thứ tự slide. */
export const parsePresentation = async (blob) => {
    const zip = await JSZip.loadAsync(blob);
    const slideFiles = Object.keys(zip.files)
        .filter((path) => path.match(/^ppt\/slides\/slide\d+\.xml$/i))
        .sort((a, b) => {
            const numA = parseInt(a.match(/slide(\d+)\.xml/i)[1], 10);
            const numB = parseInt(b.match(/slide(\d+)\.xml/i)[1], 10);
            return numA - numB;
        });

    if (!slideFiles.length) throw new Error("Không tìm thấy slide nào.");

    const parser = new DOMParser();
    return Promise.all(
        slideFiles.map(async (filePath, index) => {
            const xmlText = await zip.files[filePath].async("text");
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");
            const paragraphs = Array.from(xmlDoc.getElementsByTagName("a:p"));
            const text = paragraphs
                .map((paragraph) =>
                    Array.from(paragraph.getElementsByTagName("a:t"))
                        .map((node) => node.textContent)
                        .join("")
                        .trim(),
                )
                .filter(Boolean);
            return { number: index + 1, text };
        }),
    );
};
