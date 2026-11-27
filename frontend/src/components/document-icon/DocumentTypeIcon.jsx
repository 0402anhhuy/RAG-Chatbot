import { useId } from "react";
import wordIcon from "@/assets/Word.png";
import excelIcon from "@/assets/Excel.png";
import slidesIcon from "@/assets/Powerpoint.png";
import pdfIcon from "@/assets/PDF.png";
import markdownIcon from "@/assets/Markdown.png";
import "@/components/document-icon/DocumentTypeIcon.css";

/**
 * Ảnh icon chính thức (PNG nền trong suốt) theo từng loại tài liệu. Có ảnh thì
 * dùng ảnh để giống icon trên máy tính; loại chưa có ảnh (text, file lạ) vẫn rơi
 * về SVG tự vẽ bên dưới.
 */
const BRAND_IMAGES = {
    word: wordIcon,
    excel: excelIcon,
    slides: slidesIcon,
    pdf: pdfIcon,
    markdown: markdownIcon,
};

/**
 * Icon "app" cho từng loại tài liệu học tập.
 *
 * Loại có ảnh trong src/assets (Word, Excel, PowerPoint, PDF, Markdown) render
 * bằng <img> đúng logo ứng dụng; các loại còn lại (text, file lạ) dùng SVG tự vẽ
 * dạng badge bo góc + chữ viết tắt (TXT, ?) để cả hàng icon vẫn đồng bộ.
 *
 * @param ext phần mở rộng tài liệu: pdf | doc docx | xls xlsx csv | ppt pptx |
 * md markdown | txt (các giá trị khác dùng icon File trung tính)
 * @param size kích thước cạnh (px), mặc định 26
 * @param labelled hiển thị nhãn chữ trong icon, mặc định true
 */
const DocumentTypeIcon = ({ ext = "", size = 26, labelled = true, className = "" }) => {
    const kind = kindOf(ext);
    // ID gradient phải duy nhất cho từng instance để nhiều icon trên một trang
    // không ghi đè gradient của nhau.
    const uid = useId().replace(/:/g, "");

    const image = BRAND_IMAGES[kind];
    if (image) {
        return (
            <img
                className={`document-type-icon kind-${kind} ${className}`}
                src={image}
                width={size}
                height={size}
                alt={labelOf(kind)}
                draggable={false}
                loading="lazy"
            />
        );
    }

    return (
        <svg
            className={`document-type-icon kind-${kind} ${className}`}
            width={size}
            height={size}
            viewBox="0 0 32 32"
            role="img"
            aria-label={labelOf(kind)}
        >
            {/* Gradient dùng chung cho các ô thương hiệu */}
            <PlateShine uid={uid} />
            {kind === "pdf" && <PdfBadge uid={uid} labelled={labelled} />}
            {kind === "word" && <WordBadge uid={uid} labelled={labelled} />}
            {kind === "excel" && <ExcelBadge uid={uid} labelled={labelled} />}
            {kind === "slides" && <SlidesBadge uid={uid} labelled={labelled} />}
            {kind === "markdown" && (
                <TextBadge uid={uid} color="var(--violet-bright)" short="MD" labelled={labelled} />
            )}
            {kind === "text" && (
                <TextBadge uid={uid} color="var(--text-muted)" short="TXT" labelled={labelled} />
            )}
            {kind === "file" && (
                <TextBadge uid={uid} color="var(--text-faint)" short="?" labelled={labelled} />
            )}
        </svg>
    );
};

// ---------------------------------------------------------------- mapping
const kindOf = (ext) => {
    switch ((ext || "").toString().trim().toLowerCase().replace(/^\./, "")) {
        case "pdf":
            return "pdf";
        case "doc":
        case "docx":
            return "word";
        case "xls":
        case "xlsx":
        case "csv":
            return "excel";
        case "ppt":
        case "pptx":
            return "slides";
        case "md":
        case "markdown":
            return "markdown";
        case "txt":
            return "text";
        default:
            return "file";
    }
};

const labelOf = (kind) => {
    switch (kind) {
        case "pdf":
            return "PDF document";
        case "word":
            return "Word document";
        case "excel":
            return "Excel spreadsheet";
        case "slides":
            return "PowerPoint presentation";
        case "markdown":
            return "Markdown file";
        case "text":
            return "Text file";
        default:
            return "File";
    }
};

// -------------------------------------------------------------- primitives
/**
 * Tấm giấy trắng có góc gấp để logo Office/PowerPoint trông như một tài liệu.
 */
/**
 * Tờ giấy phía sau khối logo: cùng chiều cao với badge để hai hình trông liền
 * khối, không bị lệch lên như một icon thứ hai rời rạc.
 */
const PaperSheet = ({ uid, tint }) => (
    <>
        <defs>
            <linearGradient id={`sheet-${uid}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor={tint} stopOpacity="0.18" />
            </linearGradient>
        </defs>
        <path
            className="dti-sheet"
            d="M15 6h9.6l6.2 6.2V26a1.6 1.6 0 0 1-1.6 1.6H15a1.6 1.6 0 0 1-1.6-1.6V7.6A1.6 1.6 0 0 1 15 6Z"
            fill={`url(#sheet-${uid})`}
            stroke="rgba(15,23,42,0.16)"
            strokeWidth="0.9"
        />
        {/* Góc gấp giấy */}
        <path d="M24.6 6 30.8 12.2H24.6V6Z" fill="rgba(15,23,42,0.16)" />
    </>
);

/**
 * Gradient phủ mờ dùng chung cho mọi ô thương hiệu — tạo cảm giác khối nổi.
 * ID có uid để nhiều icon trên cùng trang không đụng nhau.
 */
const PlateShine = ({ uid }) => (
    <defs>
        <linearGradient id={`plate-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.12" />
        </linearGradient>
    </defs>
);

/**
 * Ba dòng chữ gợi ý trên phần giấy — đủ rộng để không thành vệt mờ ở 22px.
 */
const DocLines = ({ color, opacity = 1 }) => (
    <g fill={color} opacity={opacity}>
        <rect x="19.4" y="13.4" width="9.2" height="1.5" rx="0.75" />
        <rect x="19.4" y="16.8" width="7" height="1.5" rx="0.75" />
        <rect x="19.4" y="20.2" width="8.2" height="1.5" rx="0.75" />
    </g>
);

/**
 * Nhãn chữ căn giữa ô thương hiệu (ô rộng 20 x cao 20, tâm tại 11, 18).
 *
 * Dùng `dy="0.35em"` thay cho dominantBaseline vì baseline mặc định lệch lên
 * trên khiến chữ W/X/P trông như bị trôi khỏi ô ở kích thước lớn.
 */
const PlateText = ({ children, fontSize = 8.4 }) => (
    <text
        x="11"
        y="18"
        dy="0.35em"
        textAnchor="middle"
        fontFamily="'Segoe UI Semibold', 'Segoe UI', 'Inter', system-ui, sans-serif"
        fontSize={fontSize}
        fontWeight="800"
        fill="#ffffff"
        stroke="rgba(0,0,0,0.14)"
        strokeWidth="0.3"
        paintOrder="stroke"
        letterSpacing="0.2"
    >
        {children}
    </text>
);

/**
 * Ô logo thương hiệu: hình vuông bo góc chiếm nửa trái icon, kèm ánh sáng mờ
 * trên đỉnh để trông nổi khối như icon ứng dụng.
 */
const BrandPlate = ({ uid, from, to }) => (
    <>
        <defs>
            <linearGradient id={`plate-fill-${uid}`} x1="0" y1="0" x2="0.8" y2="1">
                <stop offset="0%" stopColor={from} />
                <stop offset="100%" stopColor={to} />
            </linearGradient>
        </defs>
        <rect x="1" y="8" width="20" height="20" rx="3.4" fill={`url(#plate-fill-${uid})`} />
        <rect
            x="1"
            y="8"
            width="20"
            height="20"
            rx="3.4"
            fill={`url(#plate-${uid})`}
            opacity="0.4"
        />
    </>
);

// ------------------------------------------------------------------- logos
/** Word: ô xanh dương + chữ W (kiểu banner Office). */
const WordBadge = ({ uid, labelled }) => (
    <>
        <PaperSheet uid={uid} tint="#dbeafe" />
        <BrandPlate uid={uid} from="#3f9bff" to="#1140a0" />
        {labelled ? (
            <PlateText fontSize="12">W</PlateText>
        ) : (
            <path
                d="M6 14 8.3 23h2.2l1.3-5 1.3 5h2.2L17 14h-2l-1.4 5.6L12.2 14h-1.7l-1.4 5.6L7.7 14H6Z"
                fill="#fff"
            />
        )}
        <DocLines color="rgba(17,64,160,0.34)" />
    </>
);

/** Excel: ô xanh lá + dấu X + lưới bảng tính. */
const ExcelBadge = ({ uid, labelled }) => (
    <>
        <PaperSheet uid={uid} tint="#dcfce7" />
        <BrandPlate uid={uid} from="#22c55e" to="#0b6b34" />
        {labelled ? (
            <PlateText fontSize="12">X</PlateText>
        ) : (
            <path
                d="M7 14h2.4l1.9 3.1 1.9-3.1H16l-3 4.6 3.1 4.7h-2.5l-2-3.2-2 3.2H7.1l3.1-4.7L7 14Z"
                fill="#fff"
            />
        )}
        {/* Lưới ô tính 2x3 */}
        <g fill="rgba(11,107,52,0.36)">
            <rect x="19" y="12.6" width="4.6" height="3.4" rx="0.6" />
            <rect x="24.4" y="12.6" width="4.6" height="3.4" rx="0.6" />
            <rect x="19" y="16.8" width="4.6" height="3.4" rx="0.6" />
            <rect x="24.4" y="16.8" width="4.6" height="3.4" rx="0.6" />
        </g>
    </>
);

/** PowerPoint: ô cam + chữ P + khung trình chiếu có nút play. */
const SlidesBadge = ({ uid, labelled }) => (
    <>
        <PaperSheet uid={uid} tint="#ffedd5" />
        <BrandPlate uid={uid} from="#fb923c" to="#b93f0b" />
        {labelled ? (
            <PlateText fontSize="12">P</PlateText>
        ) : (
            <path
                d="M7 14h4.3c2.2 0 3.6 1.3 3.6 3.4 0 2.2-1.4 3.5-3.6 3.5H9v2.6H7V14Zm2 1.9v3.2h2c1 0 1.6-.6 1.6-1.6 0-1-.6-1.6-1.6-1.6h-2Z"
                fill="#fff"
            />
        )}
        {/* Khung trình chiếu + chân đế */}
        <g fill="rgba(185,63,11,0.34)">
            <rect x="19" y="11.6" width="10" height="7" rx="1" />
            <rect x="22.9" y="19.2" width="2.2" height="1.5" />
            <rect x="20.8" y="20.7" width="6.4" height="1.4" rx="0.7" />
        </g>
        {/* Tam giác "play" để bài giảng dễ nhận ra */}
        <path d="M22.9 13.2v3.8l3.3-1.9-3.3-1.9Z" fill="#ffffff" fillOpacity="0.95" />
    </>
);

/** PDF: ô đỏ + chữ PDF + các dòng văn bản. */
const PdfBadge = ({ uid, labelled }) => (
    <>
        <PaperSheet uid={uid} tint="#fee2e2" />
        <BrandPlate uid={uid} from="#f65c5c" to="#9d1414" />
        {labelled ? (
            <PlateText fontSize="7.6">PDF</PlateText>
        ) : (
            <path
                d="M5.8 14h3.4c1.9 0 3.1 1.1 3.1 2.9 0 1.8-1.2 2.9-3.1 2.9H7.4v2.6H5.8V14Zm1.6 1.6v3h1.6c1 0 1.6-.5 1.6-1.5 0-1-.6-1.5-1.6-1.5H7.4Z"
                fill="#fff"
            />
        )}
        <DocLines color="rgba(157,20,20,0.36)" />
    </>
);

/**
 * MD / TXT / file lạ: giữ nguyên bố cục tờ giấy + ô logo như Word/Excel/PPT
 * để cả hàng icon đồng bộ, chỉ khác là một màu phẳng (không có logo thương mại).
 */
const TextBadge = ({ uid, color, short, labelled }) => (
    <>
        <PaperSheet uid={uid} tint="var(--text-faint)" />
        <defs>
            <linearGradient id={`flat-${uid}`} x1="0" y1="0" x2="0.8" y2="1">
                <stop offset="0%" stopColor={color} />
                <stop offset="100%" stopColor={shorten(color, 0.78)} />
            </linearGradient>
        </defs>
        <rect x="1" y="8" width="20" height="20" rx="3.4" fill={`url(#flat-${uid})`} />
        <rect
            x="1"
            y="8"
            width="20"
            height="20"
            rx="3.4"
            fill={`url(#plate-${uid})`}
            opacity="0.4"
        />
        {labelled && <PlateText fontSize={short.length > 2 ? 7.4 : 11}>{short}</PlateText>}
        <DocLines color="var(--text-muted)" opacity={0.3} />
    </>
);

/**
 * Làm tối một mã màu hex theo hệ số (0..1) — dùng cho gradient phẳng.
 */
const shorten = (hex, factor) => {
    const clean = hex.replace("#", "");
    const to = (part) => Math.max(0, Math.round(parseInt(part, 16) * factor));
    const value = [to(clean.slice(0, 2)), to(clean.slice(2, 4)), to(clean.slice(4, 6))];
    return `#${value.map((n) => n.toString(16).padStart(2, "0")).join("")}`;
};

export default DocumentTypeIcon;
