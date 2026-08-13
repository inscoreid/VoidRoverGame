"use client";

import { useState } from "react";
import { ethers } from "ethers";

declare global {
  interface Window {
    ethereum?: any;
  }
}

const GAME_ABI = [
  "function mintRover() external",
  "function explore(uint256 tokenId) external",
  "function rovers(uint256) view returns (uint256 hull, uint256 fuel, uint256 distance)"
];

// ВСТАВЬ СВОЙ АДРЕС ИЗ REMIX СЮДА:
const GAME_ADDRESS = "ТВОЙ_АДРЕС_КОНТРАКТА_ИГРЫ"; 

const BASE_MAINNET_PARAMS = {
  chainId: "0x2105", 
  chainName: "Base",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://mainnet.base.org"],
  blockExplorerUrls: ["https://basescan.org/"]
};

interface RoverData {
  hull: string;
  fuel: string;
  distance: string;
}

export default function Home() {
  const [account, setAccount] = useState("");
  const [status, setStatus] = useState("");
  const [roverData, setRoverData] = useState<RoverData | null>(null);
  
  // Вернули стейт для управления разными вездеходами!
  const [tokenId, setTokenId] = useState("0"); 

  const checkAndSwitchNetwork = async () => {
    if (!window.ethereum) return false;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      
      if (network.chainId !== BigInt(8453)) {
        setStatus("Переключаем на сеть Base...");
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: BASE_MAINNET_PARAMS.chainId }],
          });
        } catch (switchError: unknown) {
          const err = switchError as { code: number };
          if (err.code === 4902) {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [BASE_MAINNET_PARAMS],
            });
          } else {
            throw switchError;
          }
        }
      }
      return true;
    } catch (error) {
      console.error(error);
      setStatus("Ошибка при переключении сети. Выбери Base вручную.");
      return false;
    }
  };

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const isCorrectNetwork = await checkAndSwitchNetwork();
        if (!isCorrectNetwork) return;

        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        setAccount(accounts[0]);
        setStatus("Кошелек подключен! Сеть: Base");
      } catch (error) {
        console.error(error);
      }
    } else {
      setStatus("Установи MetaMask");
    }
  };

  const getContract = async () => {
    const isCorrectNetwork = await checkAndSwitchNetwork();
    if (!isCorrectNetwork) throw new Error("Неверная сеть");
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return new ethers.Contract(GAME_ADDRESS, GAME_ABI, signer);
  };

  const mintRover = async () => {
    try {
      setStatus("Создаем новый вездеход...");
      const contract = await getContract();
      const tx = await contract.mintRover();
      setStatus("Транзакция отправлена. Ждем блоки...");
      await tx.wait();
      setStatus("Новый вездеход успешно создан! Увеличь Rover ID на 1, чтобы увидеть его.");
    } catch (err: unknown) {
      setStatus("Ошибка: " + (err instanceof Error ? err.message : "Транзакция отклонена"));
    }
  };

  const explore = async () => {
    if (roverData && parseInt(roverData.fuel) < 10) {
      setStatus("Бро, у этого корыта нет топлива. Минти новый!");
      return;
    }
    if (roverData && parseInt(roverData.hull) <= 0) {
      setStatus("Вездеход уничтожен. Минти новый!");
      return;
    }

    try {
      setStatus(`Отправляем вездеход #${tokenId} в пустоту...`);
      const contract = await getContract();
      const tx = await contract.explore(tokenId);
      await tx.wait();
      setStatus("Экспедиция завершена!");
      fetchRoverStats();
    } catch (err: unknown) {
      setStatus("Ошибка: " + (err instanceof Error ? err.message : "Транзакция отклонена"));
    }
  };

  const fetchRoverStats = async () => {
    try {
      setStatus("Загрузка статов...");
      const contract = await getContract();
      const data = await contract.rovers(tokenId);
      setRoverData({
        hull: data.hull.toString(),
        fuel: data.fuel.toString(),
        distance: data.distance.toString()
      });
      setStatus("Статы обновлены!");
    } catch (err) {
      console.log("Вездеход не найден");
      setStatus(`Вездеход #${tokenId} еще не существует`);
      setRoverData(null);
    }
  };

  return (
<main className="flex min-h-screen flex-col items-center justify-center p-24 text-white font-mono bg-[linear-gradient(to_bottom,rgba(9,9,11,0.8),rgba(9,9,11,0.98)),url('/bg.jpg')] bg-cover bg-center bg-fixed">      <h1 className="text-5xl font-black mb-2 text-orange-500 tracking-tighter">VOID ROVER</h1>
      <p className="text-zinc-500 mb-8 tracking-widest text-sm uppercase">Base Mainnet Edition</p>
      
      {!account ? (
        <button onClick={connectWallet} className="px-8 py-3 bg-white text-black font-bold rounded hover:bg-zinc-200 transition-colors">
          CONNECT WALLET
        </button>
      ) : (
        <div className="flex flex-col items-center w-full max-w-md bg-zinc-900 p-6 rounded-xl border border-zinc-800 shadow-2xl">
          <p className="text-xs text-green-400 mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            Connected: {account.slice(0,6)}...{account.slice(-4)}
          </p>
          
          <button onClick={mintRover} className="w-full mb-6 py-3 bg-zinc-800 text-sm rounded border border-zinc-700 hover:bg-zinc-700 transition-colors">
            + Сминтить новый Вездеход
          </button>

          <div className="w-full bg-black p-4 rounded-lg mb-6 border border-zinc-800">
            <label className="block text-xs text-zinc-500 mb-2">Выбери Rover ID из гаража:</label>
            <div className="flex gap-2">
              <input 
                type="number" 
                min="0"
                value={tokenId} 
                onChange={(e) => setTokenId(e.target.value)}
                className="w-20 bg-zinc-900 text-orange-400 font-bold text-center border border-zinc-700 rounded outline-none focus:border-orange-500"
              />
              <button onClick={fetchRoverStats} className="flex-1 py-2 bg-zinc-800 text-sm rounded hover:bg-zinc-700 transition-colors">
                Загрузить статы
              </button>
            </div>
          </div>

          {roverData && (
            <div className="w-full space-y-3 text-sm mb-6 px-2">
              <div className="flex justify-between"><span className="text-zinc-400">Прочность:</span> 
                <span className={parseInt(roverData.hull) < 30 ? "text-red-500 font-bold" : "text-white"}>{roverData.hull} %</span>
              </div>
              <div className="flex justify-between"><span className="text-zinc-400">Топливо:</span> 
                <span className={parseInt(roverData.fuel) < 20 ? "text-red-500 font-bold" : "text-white"}>{roverData.fuel} L</span>
              </div>
              <div className="flex justify-between"><span className="text-zinc-400">Дистанция:</span> 
                <span className="text-green-400 font-bold">{roverData.distance} km</span>
              </div>
            </div>
          )}

          <button 
            onClick={explore} 
            disabled={!roverData}
            className={`w-full py-4 text-white font-black text-lg rounded transition-all ${
              roverData ? "bg-orange-600 hover:bg-orange-500 hover:scale-[1.02]" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
            }`}
          >
            ИССЛЕДОВАТЬ ПУСТОТУ
          </button>
        </div>
      )}

      {status && (
        <div className="mt-6 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded text-sm text-center text-zinc-400 max-w-lg break-words">
          {status}
        </div>
      )}
    </main>
  );
}
