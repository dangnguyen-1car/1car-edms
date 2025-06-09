// src/frontend/src/components/common/Breadcrumb.js
import React from 'react';
import { Link } from 'react-router-dom';
import { FiChevronRight, FiHome } from 'react-icons/fi';

function Breadcrumb({ items = [] }) {
  if (!items || items.length === 0) return null;

  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        {items.map((item, index) => (
          <li key={index} className="inline-flex items-center">
            {index > 0 && (
              <FiChevronRight className="w-4 h-4 text-gray-400 mx-1" />
            )}
            
            {item.current ? (
              <span className="text-sm font-medium text-gray-500 cursor-default">
                {index === 0 && <FiHome className="w-4 h-4 mr-1 inline" />}
                {item.label}
              </span>
            ) : (
              <Link
                to={item.href}
                className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
              >
                {index === 0 && <FiHome className="w-4 h-4 mr-1" />}
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default Breadcrumb;
