package providers

import (
	"git.mills.io/prologic/bitcask"
	"os"
)

type DBProvider struct {
	db *bitcask.Bitcask
}

func (d *DBProvider) Set(key string, value []byte) error {
	return d.db.Put([]byte(key), value)
}

func (d *DBProvider) Get(key string) ([]byte, error) {
	get, err := d.db.Get([]byte(key))
	if err != nil {
		return nil, err
	}
	return get, nil
}

func (d *DBProvider) Delete(key string) error {
	return d.db.Delete([]byte(key))
}

func (d *DBProvider) KeysWithSuffix(suffix string) ([]string, error) {
	var keys []string
	err := d.db.Scan([]byte(suffix), func(key []byte) error {
		keys = append(keys, string(key))
		return nil
	})
	if err != nil {
		return nil, err
	}
	return keys, nil
}

func NewDBProvider() *DBProvider {
	var err error
	d := &DBProvider{}
	d.db, err = bitcask.Open(os.Getenv("DB_PATH"))
	if err != nil {
		panic(err)
	}
	return d
}
