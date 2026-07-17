"""Memory system using ChromaDB for vector storage"""

import os
import asyncio
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings
from litellm import embedding as get_embedding


class Memory:
    """Vector database memory system for storing and recalling information"""
    
    def __init__(
        self,
        memory_dir: str = "./memory",
        collection_name: str = "hackract_memory",
        embedding_model: str = "text-embedding-3-small",
        api_key: str = "",
        embedding_fallback_dimension: int = 1536,
    ):
        self.memory_dir = memory_dir
        self.collection_name = collection_name
        self.embedding_model = embedding_model
        self.api_key = api_key
        self.embedding_fallback_dimension = embedding_fallback_dimension
        
        # Create memory directory
        os.makedirs(memory_dir, exist_ok=True)
        
        # Initialize ChromaDB
        self.client = chromadb.PersistentClient(
            path=memory_dir,
            settings=Settings(anonymized_telemetry=False)
        )
        
        # Get or create collection
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={"description": "HackrAct AI Agent Memory"}
        )
        
    async def _get_embedding(self, text: str) -> List[float]:
        """Get embedding for text using LiteLLM"""
        try:
            response = await asyncio.to_thread(
                get_embedding,
                model=self.embedding_model,
                input=[text],
                api_key=self.api_key
            )
            return response.data[0]['embedding']
        except Exception as e:
            print(f"Error getting embedding: {e}")
            # Return zero vector as fallback (dimension must match collection; configurable for different embedding models)
            return [0.0] * self.embedding_fallback_dimension
    
    async def save(
        self,
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
        memory_id: Optional[str] = None,
    ) -> str:
        """Save information to memory"""
        
        if metadata is None:
            metadata = {}
            
        # Generate ID if not provided
        if memory_id is None:
            import time
            memory_id = f"mem_{int(time.time() * 1000)}"
        
        # Get embedding
        embedding = await self._get_embedding(content)
        
        # Add to collection
        self.collection.add(
            ids=[memory_id],
            documents=[content],
            metadatas=[metadata],
            embeddings=[embedding]
        )
        
        return memory_id
    
    async def recall(
        self,
        query: str,
        max_results: int = 10,
        filter_metadata: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Recall information from memory"""
        
        # Get embedding for query
        query_embedding = await self._get_embedding(query)
        
        # Query collection
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=max_results,
            where=filter_metadata if filter_metadata else None,
        )
        
        # Format results
        memories = []
        if results['ids'] and len(results['ids']) > 0:
            for i in range(len(results['ids'][0])):
                memory = {
                    'id': results['ids'][0][i],
                    'content': results['documents'][0][i],
                    'metadata': results['metadatas'][0][i] if results['metadatas'] else {},
                    'distance': results['distances'][0][i] if results['distances'] else 0,
                }
                memories.append(memory)
        
        return memories
    
    async def delete(self, memory_id: str):
        """Delete a memory by ID"""
        try:
            self.collection.delete(ids=[memory_id])
            return True
        except Exception as e:
            print(f"Error deleting memory: {e}")
            return False
    
    async def forget(self, query: str, max_results: int = 1):
        """Forget memories matching query"""
        memories = await self.recall(query, max_results)
        deleted = []
        for mem in memories:
            if await self.delete(mem['id']):
                deleted.append(mem['id'])
        return deleted
    
    def count(self) -> int:
        """Get count of memories"""
        return self.collection.count()
    
    def clear(self):
        """Clear all memories"""
        self.client.delete_collection(self.collection_name)
        self.collection = self.client.create_collection(
            name=self.collection_name,
            metadata={"description": "HackrAct AI Agent Memory"}
        )
