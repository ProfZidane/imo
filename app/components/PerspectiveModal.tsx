import React from "react";

type PerspectiveModalProps = {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string | null;
    isLoading: boolean;
};

export default function PerspectiveModal({ isOpen, onClose, imageUrl, isLoading }: PerspectiveModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75" onClick={onClose}>
            <div className="relative max-w-6xl max-h-[90vh] bg-white rounded-lg shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 bg-slate-800 text-white">
                    <h2 className="text-xl font-bold">Perspective Photoréaliste</h2>
                    <button
                        onClick={onClose}
                        className="text-white hover:text-gray-300 text-2xl font-bold"
                    >
                        ×
                    </button>
                </div>

                <div className="p-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="animate-spin h-16 w-16 border-4 border-purple-600 border-t-transparent rounded-full mb-4"></div>
                            <p className="text-gray-700 text-lg">Génération de la perspective photoréaliste...</p>
                            <p className="text-gray-500 text-sm mt-2">Cela peut prendre quelques secondes</p>
                        </div>
                    ) : imageUrl ? (
                        <div className="flex flex-col items-center">
                            <img
                                src={imageUrl}
                                alt="Perspective photoréaliste"
                                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                            />
                            <div className="mt-4 flex gap-3">
                                <a
                                    href={imageUrl}
                                    download="perspective-realiste.png"
                                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm font-medium"
                                >
                                    Télécharger l'image
                                </a>
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm font-medium"
                                >
                                    Fermer
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-10 text-gray-600">
                            <p>Erreur lors de la génération de l'image</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
