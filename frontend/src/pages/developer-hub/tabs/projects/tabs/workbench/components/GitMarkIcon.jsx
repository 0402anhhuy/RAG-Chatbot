/**
 * GitMarkIcon — logo Git (hình thoi cam + nhánh trắng) theo phong cách
 * Octicons của GitHub (bộ icon MIT license). Dùng cho file .gitignore
 * trong cây thư mục của Workbench.
 */
const GitMarkIcon = ({ size = 14, className = "" }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        className={className}
        aria-hidden="true"
        focusable="false"
    >
        <path
            d="M8 1.6 14.4 8 8 14.4 1.6 8Z"
            fill="#f05133"
            stroke="#f05133"
            strokeWidth="1.7"
            strokeLinejoin="round"
        />
        <g transform="translate(3.4 3.4) scale(0.575)">
            <path
                fill="#ffffff"
                d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.493 2.493 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Zm-6 0a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm8.25-.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z"
            />
        </g>
    </svg>
);

export default GitMarkIcon;
