"use client";

import { useState } from "react";
import { ethers } from "ethers";

// Фикс для TypeScript, чтобы он не ругался на window.ethereum
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
const GAME_ADDRESS = "0xf64bA70E3a47203A932FAF95367A7b5cC6D4e884"; 

const BASE_MAINNET_PARAMS = {
  chainId: "0x2105", // 8453
  chainName: "Base",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://mainnet.base.org"],
  blockExplorerUrls: ["https://basescan.org/"]
};

export default function Home() {
  const [account, setAccount] = useState("");
  const [status, setStatus] = useState("");
  const [roverData, setRoverData] = useState<any>(null);
  const [tokenId, setTokenId] = useState("0"); 

  const checkAndSwitchNetwork = async () => {
    if (!window.ethereum) return false;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      
      if (network.chainId !== 8453n) {
        setStatus("Переключаем на сеть Base...");
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: BASE_MAINNET_PARAMS.chainId }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
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
      setStatus("Ожидание подтверждения транзакции...");
      const contract = await getContract();
      const tx = await contract.mintRover();
      setStatus("Транзакция отправлена. Ждем блоки...");
      await tx.wait();
      setStatus("Вездеход успешно создан!");
      fetchRoverStats();
    } catch (err: any) {
      setStatus("Ошибка: " + (err.reason || err.message));
    }
  };

  const explore = async () => {
    try {
      setStatus("Отправляем вездеход в пустоту...");
      const contract = await getContract();
      const tx = await contract.explore(tokenId);
      await tx.wait();
      setStatus("Экспедиция завершена!");
      fetchRoverStats();
    } catch (err: any) {
      setStatus("Ошибка: " + (err.reason || err.message));
    }
  };

  const fetchRoverStats = async () => {
    try {
      const contract = await getContract();
      const data = await contract.rovers(tokenId);
      setRoverData({
        hull: data.hull.toString(),
        fuel: data.fuel.toString(),
        distance: data.distance.toString()
      });
    } catch (err) {
      console.log("Вездеход не найден");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-zinc-950 text-white font-mono">
      <h1 className="text-5xl font-black mb-2 text-orange-500 tracking-tighter">VOID ROVER</h1>
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
          
          <div className="flex gap-4 mb-6 w-full">
            <button onClick={mintRover} className="flex-1 py-2 bg-zinc-800 text-sm rounded hover:bg-zinc-700 transition-colors">
              Минт Вездехода
            </button>
            <button onClick={fetchRoverStats} className="flex-1 py-2 bg-zinc-800 text-sm rounded hover:bg-zinc-700 transition-colors">
              Обновить
            </button>
          </div>

          {roverData && (
            <div className="w-full bg-black p-5 rounded-lg mb-6 border border-zinc-800">
              <div className="flex justify-between items-end mb-4 border-b border-zinc-800 pb-2">
                <span className="text-sm text-zinc-500">Rover ID</span>
                <span className="text-xl text-orange-500 font-bold">#{tokenId}</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-zinc-400">Прочность:</span> <span>{roverData.hull} %</span></div>
                <div className="flex justify-between"><span className="text-zinc-400">Топливо:</span> <span>{roverData.fuel} L</span></div>
                <div className="flex justify-between"><span className="text-zinc-400">Дистанция:</span> <span className="text-green-400">{roverData.distance} km</span></div>
              </div>
            </div>
          )}

          <button onClick={explore} className="w-full py-4 bg-orange-600 text-white font-black text-lg rounded hover:bg-orange-500 hover:scale-[1.02] transition-all">
            ИССЛЕДОВАТЬ ПУСТОТУ
          </button>
        </div>
      )}

      {status && (
        <div className="mt-8 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded text-sm text-center text-zinc-400 max-w-lg break-words">
          {status}
        </div>
      )}
    </main>
  );
}
