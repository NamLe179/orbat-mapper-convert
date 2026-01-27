"use client";

import React, { useState, useEffect, Fragment } from "react";
import { Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { InboxIcon } from "@heroicons/react/24/outline";

interface NotificationItemProps {
  title?: string;
  message?: string;
  duration?: number;
  onClose?: () => void; // Tương đương emit('close')
}

export default function NotificationItem({
  title = "Title",
  message = "Message",
  duration = 4000,
  onClose,
}: NotificationItemProps) {
  const [show, setShow] = useState(true);

  // Logic Timer: Tự động đóng sau khoảng thời gian duration
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setShow(false);
      }, duration);

      // Cleanup timer nếu component unmount thủ công
      return () => clearTimeout(timer);
    }
  }, [duration]);

  return (
    <Transition
      show={show}
      as={Fragment}
      appear={true}
      // Mapping các class transition từ Vue sang Headless UI
      enter="transform ease-out duration-300 transition"
      enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
      enterTo="translate-y-0 opacity-100 sm:translate-x-0"
      leave="transition ease-in duration-100"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
      // Thay thế cho logic setTimeout 150ms: Gọi onClose sau khi hiệu ứng leave kết thúc
      afterLeave={() => onClose?.()}
    >
      <div className="ring-opacity-5 bg-background pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg shadow-lg ring-1 ring-black">
        <div className="p-4">
          <div className="flex items-start">
            <div className="flex w-0 flex-1 justify-between">
              <p className="text-foreground w-0 flex-1 text-sm font-medium">
                {message}
              </p>
            </div>

            <div className="ml-4 flex shrink-0">
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground focus:ring-ring bg-background inline-flex rounded-md focus:ring-2 focus:ring-offset-2 focus:outline-hidden"
                onClick={() => setShow(false)}
              >
                <span className="sr-only">Close</span>
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  );
}