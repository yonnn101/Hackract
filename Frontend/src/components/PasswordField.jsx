import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const PasswordField = ({ value, onChange }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center w-full bg-gray-100 rounded-sm px-3 py-3 border border-transparent focus-within:border-black transition-all duration-300">
      <span className="text-xs font-mono text-gray-500 mr-2 select-none">root@hackract:~$</span>
      <input
        type={show ? "text" : "password"}
        id="password"
        name="password"
        placeholder="••••••••"
        value={value}
        onChange={onChange}
        autoComplete="password"
        className="flex-1 bg-transparent outline-none text-sm font-mono placeholder-gray-400 text-gray-900 cursor-text"
        required
        onPointerDown={() => setShow(true)}
        onPointerUp={() => setShow(false)}
        onPointerLeave={() => setShow(false)}
      />
      <span
        className="ml-2 cursor-pointer text-gray-500 hover:text-black select-none"
        onPointerDown={() => setShow(true)}
        onPointerUp={() => setShow(false)}
        onPointerLeave={() => setShow(false)}
        tabIndex={0}
        role="button"
      >
        {show ? <FaEyeSlash /> : <FaEye />}
      </span>
    </div>
  );
};

export default PasswordField;
