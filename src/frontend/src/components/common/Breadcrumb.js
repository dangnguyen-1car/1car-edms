// src/frontend/src/components/common/Breadcrumb.js
import React from 'react';
import { Link } from 'react-router-dom';
import { FiChevronRight } from 'react-icons/fi';

function Breadcrumb({ items = [] }) {
    if (!items || items.length === 0) return null;

    return (
        <nav className="flex mb-6" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
                {items.map((item, index) => {
                    const isLast = index === items.length - 1;
                    const Icon = item.icon;

                    return (
                        <li key={index} className="inline-flex items-center">
                            {index > 0 && (
                                <FiChevronRight className="w-4 h-4 text-gray-400 mx-1" />
                            )}

                            {isLast ? (
                                <span className="flex items-center text-sm font-medium text-gray-500">
                                    {Icon && <Icon className="w-4 h-4 mr-2" />}
                                    {item.label}
                                </span>
                            ) : (
                                <Link
                                    to={item.href}
                                    className="flex items-center text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                                >
                                    {Icon && <Icon className="w-4 h-4 mr-2" />}
                                    {item.label}
                                </Link>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}

export default Breadcrumb;
